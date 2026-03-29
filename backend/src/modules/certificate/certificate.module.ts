import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';

import { Certificate } from './entities/certificate.entity';
import { Verification } from './entities/verification.entity';
import { CertificateTransfer } from './entities/certificate-transfer.entity';

import { CertificateService } from './certificate.service';
import { CertificateStatsService } from './services/stats.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { CertificateRepository } from './repositories/certificate.repository';
import { CertificateMapper } from './mappers/certificate.mapper';
import { CertificateTransferService } from './services/certificate-transfer.service';
import { CertificateExpirationJob } from './jobs/certificate-expiration.job';

import { CertificateController } from './certificate.controller';
import { DuplicateDetectionController } from './controllers/duplicate-detection.controller';
import { CertificateTransferController } from './controllers/certificate-transfer.controller';

import { MetadataSchemaModule } from '../metadata-schema/metadata-schema.module';
import { AuthModule } from '../auth/auth.module';
import { StellarModule } from '../stellar/stellar.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification, CertificateTransfer]),
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
    ConfigModule,
    MetadataSchemaModule,
    AuthModule,
    StellarModule,
    AuditModule,
    FilesModule,
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
    CertificateRepository,
    CertificateMapper,
    CertificateTransferService,
    CertificateExpirationJob,
  ],
  exports: [CertificateService, CertificateStatsService, CertificateRepository],
})
export class CertificateModule {}
