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
import { FilesModule } from '../files/files.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

// Import services directly
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionController } from './controllers/duplicate-detection.controller';
import { CertificateTransferService } from './services/certificate-transfer.service';
import { CertificateTransferController } from './controllers/certificate-transfer.controller';
import { CertificateExpirationJob } from './jobs/certificate-expiration.job';
import { CertificateTransfer } from './entities/certificate-transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification, CertificateTransfer]),
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
    MetadataSchemaModule,
    AuthModule,
    FilesModule,
    AuditModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [
    CertificateController,
    DuplicateDetectionController,
    CertificateTransferController,
  ],
  providers: [
    CertificateService,
    CertificateStatsService,
    DuplicateDetectionService,
    CertificateTransferService,
    CertificateExpirationJob,
  ],
  exports: [CertificateService, CertificateStatsService],
})
export class CertificateModule {}
