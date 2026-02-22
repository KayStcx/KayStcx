import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Issuer } from '../../modules/issuers/entities/issuer.entity';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggingService } from '../logging/logging.service';

export enum IssuerTier {
  FREE = 'free',
  PAID = 'paid',
}

export interface IssuerContext {
  id: string;
  tier: IssuerTier;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface UsageBucket {
  windowStart: number;
  count: number;
  tier: IssuerTier;
  notifiedUpgrade: boolean;
}

interface CachedIssuer {
  issuerId: string;
  tier: IssuerTier;
  cacheUntil: number;
}

export const RATE_LIMIT_QUEUE_NAME = 'rate-limit-queue';

export enum RateLimitJobType {
  EXCEEDED = 'rate-limit-exceeded',
  UPGRADE_NOTIFICATION = 'rate-limit-upgrade-notification',
}

@Injectable()
export class RateLimitService {
  private readonly windowMs: number;
  private readonly freeLimit: number;
  private readonly paidLimit: number;
  private readonly usage = new Map<string, UsageBucket>();
  private readonly issuerCache = new Map<string, CachedIssuer>();

  constructor(
    @InjectRepository(Issuer)
    private readonly issuerRepository: Repository<Issuer>,
    @InjectQueue(RATE_LIMIT_QUEUE_NAME)
    private readonly rateLimitQueue: Queue,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly loggingService: LoggingService,
  ) {
    this.windowMs =
      Number(this.configService.get('RATE_LIMIT_WINDOW_MS')) || 60_000;
    this.freeLimit =
      Number(this.configService.get('RATE_LIMIT_FREE_PER_WINDOW')) || 60;
    this.paidLimit =
      Number(this.configService.get('RATE_LIMIT_PAID_PER_WINDOW')) || 600;
  }

  async resolveIssuer(apiKey: string): Promise<IssuerContext | null> {
    const now = Date.now();
    const cached = this.issuerCache.get(apiKey);

    if (cached && cached.cacheUntil > now) {
      return { id: cached.issuerId, tier: cached.tier };
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const issuer = await this.issuerRepository.findOne({
      where: { apiKeyHash, isActive: true },
    });

    if (!issuer) {
      return null;
    }

    const tier = issuer.tier || IssuerTier.FREE;

    this.issuerCache.set(apiKey, {
      issuerId: issuer.id,
      tier,
      cacheUntil: now + 5 * 60_000,
    });

    return { id: issuer.id, tier };
  }

  consume(
    issuerId: string,
    tier: IssuerTier,
    routeKey: string,
  ): RateLimitResult {
    const key = `${issuerId}:${routeKey}`;
    const now = Date.now();
    const limit = tier === IssuerTier.PAID ? this.paidLimit : this.freeLimit;

    let bucket = this.usage.get(key);

    if (!bucket) {
      bucket = {
        windowStart: now,
        count: 0,
        tier,
        notifiedUpgrade: false,
      };
      this.usage.set(key, bucket);
    }

    if (now - bucket.windowStart >= this.windowMs) {
      bucket.windowStart = now;
      bucket.count = 0;
      bucket.notifiedUpgrade = false;
      bucket.tier = tier;
    }

    if (bucket.count >= limit) {
      this.enqueueExceeded(issuerId, tier, routeKey, now, limit, bucket.count);
      const resetAt = bucket.windowStart + this.windowMs;

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    bucket.count += 1;

    const remaining = Math.max(limit - bucket.count, 0);
    const resetAt = bucket.windowStart + this.windowMs;

    if (
      tier === IssuerTier.FREE &&
      !bucket.notifiedUpgrade &&
      bucket.count >= Math.floor(limit * 0.8)
    ) {
      bucket.notifiedUpgrade = true;
      this.notifyUpgrade(issuerId, routeKey, limit, bucket.count);
    }

    this.metricsService.recordHttpRequestDuration('API_KEY', routeKey, 200, 0);

    return {
      allowed: true,
      limit,
      remaining,
      resetAt,
    };
  }

  getUsageSummary() {
    const summary: {
      issuerId: string;
      route: string;
      tier: IssuerTier;
      count: number;
      limit: number;
      resetAt: number;
    }[] = [];

    const now = Date.now();

    for (const [key, bucket] of this.usage.entries()) {
      if (now - bucket.windowStart >= this.windowMs) {
        continue;
      }

      const [issuerId, route] = key.split(':');
      const limit =
        bucket.tier === IssuerTier.PAID ? this.paidLimit : this.freeLimit;

      summary.push({
        issuerId,
        route,
        tier: bucket.tier,
        count: bucket.count,
        limit,
        resetAt: bucket.windowStart + this.windowMs,
      });
    }

    return summary;
  }

  private async enqueueExceeded(
    issuerId: string,
    tier: IssuerTier,
    routeKey: string,
    timestamp: number,
    limit: number,
    count: number,
  ): Promise<void> {
    await this.rateLimitQueue.add(RateLimitJobType.EXCEEDED, {
      issuerId,
      tier,
      route: routeKey,
      timestamp,
      limit,
      count,
    });
  }

  private async notifyUpgrade(
    issuerId: string,
    routeKey: string,
    limit: number,
    count: number,
  ): Promise<void> {
    await this.rateLimitQueue.add(RateLimitJobType.UPGRADE_NOTIFICATION, {
      issuerId,
      route: routeKey,
      limit,
      count,
    });

    this.loggingService.log(
      `Issuer ${issuerId} reached ${count}/${limit} requests on ${routeKey}`,
    );
  }
}
