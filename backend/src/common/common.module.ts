import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggingService } from './logging/logging.service';
import { CorrelationIdMiddleware } from './logging/correlation-id.middleware';
import { MetricsService } from './monitoring/metrics.service';
import { SentryService } from './monitoring/sentry.service';
import { MetricsMiddleware } from './monitoring/metrics.middleware';

@Module({
  providers: [LoggingService, MetricsService, SentryService],
  exports: [LoggingService, MetricsService, SentryService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
