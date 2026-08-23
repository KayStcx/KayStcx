import { HttpException } from '@nestjs/common';
import { IpRateLimitGuard } from './ip-rate-limit.guard';

interface StoredEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Minimal in-memory Redis double that emulates the semantics of the Lua
 * script used by the guard (INCR + conditional EXPIRE on first hit). It also
 * records direct method calls so tests can assert that the guard issues a
 * single atomic EVAL instead of separate INCR/EXPIRE commands.
 */
class MockRedis {
  private readonly store = new Map<string, StoredEntry>();
  readonly evalCalls: Array<{ script: string; key: string; args: unknown[] }> =
    [];
  readonly incrCalls: string[] = [];
  readonly expireCalls: string[] = [];
  readonly getCalls: string[] = [];

  private rawGet(key: string): StoredEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  get(key: string): string | null {
    this.getCalls.push(key);
    const entry = this.rawGet(key);
    return entry ? entry.value : null;
  }

  ttl(key: string): number {
    const entry = this.rawGet(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  incr(key: string): number {
    this.incrCalls.push(key);
    const entry = this.rawGet(key);
    const next = (entry ? parseInt(entry.value, 10) : 0) + 1;
    this.store.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt ?? null,
    });
    return next;
  }

  expire(key: string, seconds: number): number {
    this.expireCalls.push(key);
    const entry = this.rawGet(key);
    if (entry) entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  /**
   * Emulates the guard's INCREMENT_AND_EXPIRE_SCRIPT: increment the key and,
   * on the first hit of a window, attach the expiry.
   */
  eval(script: string, numKeys: number, key: string, ...args: unknown[]) {
    this.evalCalls.push({ script, key, args });
    // Mirror Redis semantics: INCR preserves the existing TTL; EXPIRE is
    // only applied on the first hit of a window.
    const existing = this.rawGet(key);
    const current = (existing ? parseInt(existing.value, 10) : 0) + 1;
    this.store.set(key, {
      value: String(current),
      expiresAt:
        current === 1
          ? Date.now() + Number(args[0]) * 1000
          : (existing?.expiresAt ?? null),
    });
    return current;
  }

  *scanStream(opts: { match: string }): Generator<string[]> {
    const pattern = opts.match;
    const prefix = pattern.slice(0, -1);
    const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
    if (keys.length > 0) yield keys;
  }
}

describe('IpRateLimitGuard', () => {
  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  };

  const makeContext = (ip = '1.2.3.4') => {
    const header = jest.fn();
    const request = {
      headers: {},
      connection: { remoteAddress: ip },
      socket: { remoteAddress: ip },
    };
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ header }),
      }),
    };
    return { context, header };
  };

  const makeGuard = (redis: MockRedis) =>
    new IpRateLimitGuard(redis as any, configService as any);

  it('allows requests under the limit and increments the counter', async () => {
    const redis = new MockRedis();
    const guard = makeGuard(redis);
    const { context, header } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(redis.evalCalls).toHaveLength(1);
    expect(redis.get('rate-limit:ip:1.2.3.4')).toBe('1');
    expect(header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    expect(header).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    expect(header).toHaveBeenCalledWith(
      'X-RateLimit-Reset',
      expect.any(String),
    );
  });

  it('blocks requests once the limit is reached', async () => {
    const redis = new MockRedis();
    const guard = makeGuard(redis);

    for (let i = 0; i < 100; i++) {
      await guard.canActivate(makeContext().context);
    }

    await expect(guard.canActivate(makeContext().context)).rejects.toThrow(
      HttpException,
    );
    await expect(
      guard.canActivate(makeContext().context),
    ).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({ retryAfter: expect.any(Number) }),
    });
  });

  it('keeps the counter after a guard restart (shared store)', async () => {
    const redis = new MockRedis();
    const firstInstance = makeGuard(redis);

    // Record 50 hits on the first instance
    for (let i = 0; i < 50; i++) {
      await firstInstance.canActivate(makeContext().context);
    }

    // A new guard instance (as after a process restart) shares the same store
    const restartedInstance = makeGuard(redis);
    const status = await restartedInstance.getRateLimitStatus('1.2.3.4');

    expect(status?.count).toBe(50);

    // The counter continues from where it left off
    await restartedInstance.canActivate(makeContext().context);
    await expect(
      restartedInstance.getRateLimitStatus('1.2.3.4'),
    ).resolves.toMatchObject({ count: 51 });
  });

  it('shares state across two simultaneously running instances', async () => {
    const redis = new MockRedis();
    const instanceA = makeGuard(redis);
    const instanceB = makeGuard(redis);

    for (let i = 0; i < 3; i++) {
      await instanceA.canActivate(makeContext().context);
    }
    for (let i = 0; i < 2; i++) {
      await instanceB.canActivate(makeContext().context);
    }

    await expect(
      instanceA.getRateLimitStatus('1.2.3.4'),
    ).resolves.toMatchObject({ count: 5 });
    await expect(
      instanceB.getRateLimitStatus('1.2.3.4'),
    ).resolves.toMatchObject({ count: 5 });
  });

  it('performs the increment and expiry atomically via a single EVAL', async () => {
    const redis = new MockRedis();
    const guard = makeGuard(redis);

    await guard.canActivate(makeContext().context);

    // One atomic command: no separate INCR or EXPIRE issued by the guard
    expect(redis.evalCalls).toHaveLength(1);
    expect(redis.incrCalls).toHaveLength(0);
    expect(redis.expireCalls).toHaveLength(0);
    expect(redis.evalCalls[0].args).toEqual([60]);
  });

  it('always sets an expiry when a window is started', async () => {
    const redis = new MockRedis();
    const guard = makeGuard(redis);

    await guard.canActivate(makeContext().context);

    const key = 'rate-limit:ip:1.2.3.4';
    expect(redis.get(key)).toBe('1');
    expect(redis.ttl(key)).toBeGreaterThan(0);
  });

  it('reads getRateLimitStatus from the shared store, not local memory', async () => {
    const redis = new MockRedis();
    const instanceA = makeGuard(redis);
    const instanceB = makeGuard(redis);

    // Only instance A records hits; instance B must still see them
    for (let i = 0; i < 5; i++) {
      await instanceA.canActivate(makeContext().context);
    }

    await expect(
      instanceB.getRateLimitStatus('1.2.3.4'),
    ).resolves.toMatchObject({ count: 5, remaining: 95 });

    await expect(instanceB.getRateLimitStatus('9.9.9.9')).resolves.toBeNull();
  });

  it('returns all rate limit entries from the shared store', async () => {
    const redis = new MockRedis();
    const guard = makeGuard(redis);

    await guard.canActivate(makeContext('1.2.3.4').context);
    await guard.canActivate(makeContext('5.6.7.8').context);

    const all = await guard.getAllRateLimits();
    expect(all).toHaveLength(2);
    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ip: '1.2.3.4', count: 1 }),
        expect.objectContaining({ ip: '5.6.7.8', count: 1 }),
      ]),
    );
  });
});
