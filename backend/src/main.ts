import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SentryService } from './common/monitoring/sentry.service';
import { LoggingService } from './common/logging/logging.service';
import { MonitoringInterceptor } from './common/monitoring/monitoring.interceptor';
import { MetricsService } from './common/monitoring/metrics.service';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('🚀 Starting application...');
  console.log('📧 Email queue name:', process.env.EMAIL_QUEUE_NAME || 'email-queue');

  const sentryService = app.get(SentryService);
  const loggingService = app.get(LoggingService);
  const metricsService = app.get(MetricsService);

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
    ],
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Use global pipes and filters
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(
    new GlobalExceptionFilter(sentryService, loggingService),
  );

  // Add global monitoring interceptor
  app.useGlobalInterceptors(
    new MonitoringInterceptor(metricsService, sentryService, loggingService),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Kaystcx API')
    .setDescription('Certificate Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  loggingService.log(`Application started on port ${port}`);
}
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
