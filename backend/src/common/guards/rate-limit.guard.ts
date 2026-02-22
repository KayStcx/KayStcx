import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateLimitService } from '../rate-limiting/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const apiKeyHeader = request.headers['x-api-key'];
    const apiKey =
      typeof apiKeyHeader === 'string'
        ? apiKeyHeader
        : Array.isArray(apiKeyHeader)
          ? apiKeyHeader[0]
          : undefined;

    if (!apiKey) {
      return true;
    }

    const issuer = await this.rateLimitService.resolveIssuer(apiKey);

    if (!issuer) {
      throw new UnauthorizedException('Invalid API key');
    }

    (request as any).issuer = issuer;

    const routePath =
      (request as any).route?.path ||
      (request as any).originalUrl ||
      request.url;

    const result = this.rateLimitService.consume(
      issuer.id,
      issuer.tier,
      routePath,
    );

    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader(
      'X-RateLimit-Reset',
      Math.floor(result.resetAt / 1000).toString(),
    );

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(
        Math.ceil((result.resetAt - Date.now()) / 1000),
        1,
      );

      response.setHeader('Retry-After', retryAfterSeconds.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
