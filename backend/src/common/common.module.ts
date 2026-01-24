import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LoggingService } from './logging/logging.service';
import { CorrelationIdMiddleware } from './logging/correlation-id.middleware';
import { MetricsService } from './monitoring/metrics.service';
import { SentryService } from './monitoring/sentry.service';
import { MetricsMiddleware } from './monitoring/metrics.middleware';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './exceptions/global-exception.filter';
import { ValidationPipe } from './pipes/validation.pipe';
import { ValidationUtils, CryptoUtils, TransformUtils, StringUtils } from './utils';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    // Services
    LoggingService,
    MetricsService,
    SentryService,

    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global Validation Pipe
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },

    // Utility Providers (for DI if needed)
    {
      provide: 'VALIDATION_UTILS',
      useValue: ValidationUtils,
    },
    {
      provide: 'CRYPTO_UTILS',
      useValue: CryptoUtils,
    },
    {
      provide: 'TRANSFORM_UTILS',
      useValue: TransformUtils,
    },
    {
      provide: 'STRING_UTILS',
      useValue: StringUtils,
    },
  ],
  exports: [
    LoggingService,
    MetricsService,
    SentryService,
    JwtModule,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
