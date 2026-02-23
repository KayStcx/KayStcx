import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';
import { CertificateController } from './certificate.controller';
import { DuplicateDetectionModule } from './duplicate-detection.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { MetadataSchemaModule } from '../modules/metadata-schema/metadata-schema.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // maximum number of items in cache
    }),
    DuplicateDetectionModule,
    WebhooksModule,
    MetadataSchemaModule,
  ],
  controllers: [CertificateController],
  providers: [CertificateService, CertificateStatsService],
  exports: [CertificateService, CertificateStatsService],
})
export class CertificateModule {}
