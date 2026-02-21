import {
  Injectable,
  HttpException,
  NestMiddleware,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { NextFunction, Request, Response } from 'express';
import { RATE_LIMIT_QUEUE } from './rate-limit.module';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly skipRateLimitPaths = [
    '/api/docs',
    '/api/health',
    '/api/v1/auth',
    '/api/v2/auth',
    '/api/v1/users',
    '/api/v2/users',
    '/api/v1/issuers',
    '/api/v2/issuers',
    '/api/v1/version',
    '/api/v2/version',
  ];

  constructor(
    private readonly rateLimitService: RateLimitService,
    @InjectQueue(RATE_LIMIT_QUEUE) private readonly rateLimitQueue: Queue,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (
      this.skipRateLimitPaths.some((path) =>
        req.path === path || req.path.startsWith(`${path}/`),
      )
    ) {
      return next();
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      throw new HttpException('Missing x-api-key header', 401);
    }

    const issuer = await this.rateLimitService.resolveIssuer(apiKey);
    const result = this.rateLimitService.consume(apiKey, issuer.tier);

    const policy = result.limit;
    const isFree = issuer.tier === 'free';

    res.setHeader('X-RateLimit-Tier', issuer.tier);
    res.setHeader('X-RateLimit-Limit', policy.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000).toString());

    if (isFree) {
      res.setHeader('X-RateLimit-Upgrade', '/issuers/checkout?tier=paid');
    }

    if (!result.allowed) {
      const retryAfter = Math.max(
        1,
        Math.floor((result.resetAt.getTime() - Date.now()) / 1000),
      );
      res.setHeader('Retry-After', retryAfter.toString());

      await this.rateLimitQueue.add('request-exceeded', {
        apiKey,
        issuerId: issuer.id,
        tier: issuer.tier,
        path: req.originalUrl,
        requestedAt: new Date().toISOString(),
      });

      throw new HttpException('Rate limit exceeded', 429);
    }

    return next();
  }
}
