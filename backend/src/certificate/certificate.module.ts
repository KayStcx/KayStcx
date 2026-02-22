import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';
import { CertificateStatsController } from './certificate.controller';
import { DuplicateDetectionModule } from './duplicate-detection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // maximum number of items in cache
    }),
    DuplicateDetectionModule,
  ],
  controllers: [CertificateStatsController],
  providers: [CertificateService, CertificateStatsService],
  exports: [CertificateService, CertificateStatsService],
})
export class CertificateModule {}
