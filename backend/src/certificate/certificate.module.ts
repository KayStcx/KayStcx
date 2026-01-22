import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateStatsService } from './services/stats.service';
import { CertificateStatsController } from './certificate.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [CertificateStatsController],
  providers: [CertificateStatsService],
  exports: [CertificateStatsService],
})
export class CertificateModule {}
