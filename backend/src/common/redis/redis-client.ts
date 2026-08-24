import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Injection token for the shared Redis client.
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Provider that exposes a single ioredis client configured from the same
 * `REDIS_URL` environment variable used by the Bull queue, so rate limit
 * state survives restarts and is shared across instances.
 */
export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const redisUrl = configService.get<string>('REDIS_URL');
    return redisUrl
      ? new Redis(redisUrl)
      : new Redis({ host: 'localhost', port: 6379 });
  },
};
