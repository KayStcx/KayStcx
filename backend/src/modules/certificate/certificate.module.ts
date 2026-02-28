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

// Import services directly
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionController } from './controllers/duplicate-detection.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Verification]),
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
    MetadataSchemaModule,
    AuthModule,
    // REMOVE: DuplicateDetectionModule
  ],
  controllers: [
    CertificateController, 
    DuplicateDetectionController // Add this directly
  ],
  providers: [
    CertificateService, 
    CertificateStatsService,
    DuplicateDetectionService // Add this directly
  ],
  exports: [CertificateService, CertificateStatsService],
})
export class CertificateModule {}