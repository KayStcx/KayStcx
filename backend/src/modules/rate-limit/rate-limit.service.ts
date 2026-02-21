import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issuer } from '../issuers/entities/issuer.entity';

export interface TierRateLimit {
  limit: number;
  windowMs: number;
  burst?: number;
}

export interface RateLimitUsageState {
  apiKey: string;
  issuerId: string;
  tier: string;
  limit: number;
  remaining: number;
  resetAt: Date;
  total: number;
  exceededCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  usage: number;
}

interface ApiWindowState {
  count: number;
  windowStart: number;
  exceededCount: number;
}

@Injectable()
export class RateLimitService {
  private readonly usageMap = new Map<string, ApiWindowState>();

  constructor(
    @InjectRepository(Issuer)
    private readonly issuerRepository: Repository<Issuer>,
  ) {}

  async resolveIssuer(apiKey: string): Promise<Issuer> {
    const issuer = await this.issuerRepository.findOne({ where: { apiKey } });
    if (!issuer) {
      throw new BadRequestException('Invalid API key');
    }

    if (!issuer.isActive) {
      throw new BadRequestException('Issuer is inactive');
    }

    return issuer;
  }

  consume(apiKey: string, tier: string): RateLimitResult {
    const policy = this.getRateLimitForTier(tier);
    const now = Date.now();

    const state = this.usageMap.get(apiKey);
    if (!state || now - state.windowStart >= policy.windowMs) {
      const nextState: ApiWindowState = {
        count: 1,
        windowStart: now,
        exceededCount: state?.exceededCount ?? 0,
      };
      this.usageMap.set(apiKey, nextState);

      return {
        allowed: true,
        limit: policy.limit,
        remaining: Math.max(policy.limit - 1, 0),
        resetAt: new Date(now + policy.windowMs),
        usage: 1,
      };
    }

    state.count += 1;
    const allowed = state.count <= policy.limit;
    if (!allowed) {
      state.exceededCount += 1;
    }

    this.usageMap.set(apiKey, state);

    return {
      allowed,
      limit: policy.limit,
      remaining: Math.max(policy.limit - state.count, 0),
      resetAt: new Date(state.windowStart + policy.windowMs),
      usage: state.count,
    };
  }

  async getUsage(apiKey: string): Promise<RateLimitUsageState> {
    const issuer = await this.resolveIssuer(apiKey);
    const policy = this.getRateLimitForTier(issuer.tier);
    const now = Date.now();

    const state = this.usageMap.get(apiKey);

    if (!state || now - state.windowStart >= policy.windowMs) {
      this.usageMap.set(apiKey, {
        count: 0,
        windowStart: now,
        exceededCount: state?.exceededCount ?? 0,
      });

      return {
        apiKey,
        issuerId: issuer.id,
        tier: issuer.tier,
        limit: policy.limit,
        remaining: policy.limit,
        resetAt: new Date(now + policy.windowMs),
        total: 0,
        exceededCount: 0,
      };
    }

    return {
      apiKey,
      issuerId: issuer.id,
      tier: issuer.tier,
      limit: policy.limit,
      remaining: Math.max(policy.limit - state.count, 0),
      resetAt: new Date(state.windowStart + policy.windowMs),
      total: state.count,
      exceededCount: state.exceededCount,
    };
  }

  private getRateLimitForTier(tier: string): TierRateLimit {
    const envRaw = process.env.RATE_LIMIT_TIERS;
    const defaults = {
      free: { limit: 60, windowMs: 60 * 1000 },
      paid: { limit: 600, windowMs: 60 * 1000 },
      enterprise: { limit: 2000, windowMs: 60 * 1000 },
    };

    if (!envRaw) {
      return defaults[tier as keyof typeof defaults] ?? defaults.free;
    }

    try {
      const parsed = JSON.parse(envRaw) as Record<string, TierRateLimit>;
      const merged = {
        free: parsed.free ?? defaults.free,
        paid: parsed.paid ?? defaults.paid,
        enterprise: parsed.enterprise ?? defaults.enterprise,
        ...parsed,
      };
      return merged[tier] ?? merged.free;
    } catch {
      // Keep service resilient and avoid taking down all API traffic due to env typo.
      return defaults[tier as keyof typeof defaults] ?? defaults.free;
    }
  }
}
