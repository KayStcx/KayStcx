import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { RateLimitController } from './rate-limit.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { StellarHealthIndicator } from './indicators/stellar.health';
import { MetricsService } from '../../common/monitoring/metrics.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [TerminusModule, CommonModule],
  controllers: [HealthController, MetricsController, RateLimitController],
  providers: [DatabaseHealthIndicator, StellarHealthIndicator, MetricsService],
  exports: [MetricsService],
})
export class HealthModule {}
