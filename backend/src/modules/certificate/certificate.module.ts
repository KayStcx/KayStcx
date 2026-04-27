import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';
import { CertificateController } from './certificate.controller';
import { MetadataSchemaModule } from '../metadata-schema/metadata-schema.module';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

// Import services directly
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionController } from './controllers/duplicate-detection.controller';
import { CertificateIssuanceService } from './services/certificate-issuance.service';
import { CertificateRevocationService } from './services/certificate-revocation.service';
import { CertificateVerificationService } from './services/certificate-verification.service';
import { CertificateSearchService } from './services/certificate-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification]),
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
    MetadataSchemaModule,
    AuthModule,
    WebhooksModule,
  ],
  controllers: [
    CertificateController,
    DuplicateDetectionController,
  ],
  providers: [
    CertificateService,
    CertificateStatsService,
    DuplicateDetectionService,
    CertificateIssuanceService,
    CertificateRevocationService,
    CertificateVerificationService,
    CertificateSearchService,
  ],
  exports: [CertificateService, CertificateStatsService],
})
export class CertificateModule {}
