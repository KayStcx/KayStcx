import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuer } from '../issuers/entities/issuer.entity';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { RateLimitService } from './rate-limit.service';
import { RateLimitQueueProcessor } from './rate-limit.processor';

export const RATE_LIMIT_QUEUE = 'api-rate-limit-events';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issuer]),
    BullModule.registerQueue({
      name: RATE_LIMIT_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [RateLimitService, RateLimitQueueProcessor],
  controllers: [RateLimitController],
  exports: [RateLimitService],
})
export class RateLimitModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
  }
}
