import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis-client';

/**
 * Atomically increments the counter for a key and, on the first hit of a
 * window, sets the key expiry. Running both operations in a single Lua
 * script guarantees that a window can never be started without an expiry,
 * even under concurrency.
 */
const INCREMENT_AND_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export interface RateLimitStatus {
  count: number;
  resetTime: number;
  remaining: number;
}

export interface RateLimitEntry {
  ip: string;
  count: number;
  resetTime: number;
}

@Injectable()
export class IpRateLimitGuard implements CanActivate {
  private readonly windowMs: number;
  private readonly windowSeconds: number;
  private readonly maxRequests: number;
  private readonly keyPrefix = 'rate-limit:ip:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // Default: 100 requests per minute
    this.windowMs = this.configService.get<number>(
      'VERIFICATION_RATE_LIMIT_WINDOW_MS',
      60 * 1000,
    );
    this.windowSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));
    this.maxRequests = this.configService.get<number>(
      'VERIFICATION_RATE_LIMIT_MAX_REQUESTS',
      100,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const key = this.keyPrefix + clientIp;

    // Single atomic INCR + conditional EXPIRE; the counter lives in the
    // shared Redis store, so it survives restarts and is shared across
    // all application instances.
    const count = (await this.redis.eval(
      INCREMENT_AND_EXPIRE_SCRIPT,
      1,
      key,
      this.windowSeconds,
    )) as number;

    const ttl = await this.redis.ttl(key);
    const resetTime = Date.now() + Math.max(0, ttl) * 1000;

    if (count > this.maxRequests) {
      const resetInSeconds = Math.max(1, ttl);

      throw new HttpException(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
          retryAfter: resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', this.maxRequests.toString());
    response.header(
      'X-RateLimit-Remaining',
      Math.max(0, this.maxRequests - count).toString(),
    );
    response.header('X-RateLimit-Reset', resetTime.toString());

    return true;
  }

  private getClientIp(request: Request): string {
    // Check for forwarded IP headers (common in proxy setups)
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Take the first IP if multiple are present
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    // Fallback to connection remote address
    return (
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get current rate limit status for an IP (useful for monitoring).
   * Reads directly from the shared Redis store.
   */
  async getRateLimitStatus(ip: string): Promise<RateLimitStatus | null> {
    const key = this.keyPrefix + ip;
    const [countRaw, ttl] = await Promise.all([
      this.redis.get(key),
      this.redis.ttl(key),
    ]);

    const count = countRaw ? parseInt(countRaw, 10) : 0;
    if (count === 0 || ttl < 0) return null;

    const now = Date.now();
    const resetTime = now + ttl * 1000;

    return {
      count,
      resetTime,
      remaining: Math.max(0, this.maxRequests - count),
    };
  }

  /**
   * Get all current rate limit entries (for monitoring/debugging).
   * Reads directly from the shared Redis store.
   */
  async getAllRateLimits(): Promise<RateLimitEntry[]> {
    const keys = await this.scanKeys(this.keyPrefix + '*');
    const now = Date.now();

    const entries = await Promise.all(
      keys.map(async (key) => {
        const [countRaw, ttl] = await Promise.all([
          this.redis.get(key),
          this.redis.ttl(key),
        ]);
        return {
          ip: key.slice(this.keyPrefix.length),
          count: countRaw ? parseInt(countRaw, 10) : 0,
          resetTime: ttl > 0 ? now + ttl * 1000 : now,
        };
      }),
    );

    return entries;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }
    return keys;
  }
}
