import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { RateLimitController } from './rate-limit.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { StellarHealthIndicator } from './indicators/stellar.health';
import { MetricsService } from '../../common/monitoring/metrics.service';
import { CommonModule } from '../../common/common.module';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from '../../common/services/stellar.service';
import { IpRateLimitGuard } from '../../common/guards/ip-rate-limit.guard';

@Module({
  imports: [TerminusModule, CommonModule, ConfigModule],
  controllers: [HealthController, MetricsController, RateLimitController],
  providers: [
    DatabaseHealthIndicator,
    StellarHealthIndicator,
    MetricsService,
    StellarService,
    IpRateLimitGuard,
  ],
  exports: [MetricsService],
})
export class HealthModule {}
