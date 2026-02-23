import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificatesVerificationController } from './certificates-verification.controller';
import { CertificatesVerificationService } from './certificates-verification.service';
import { CertificatesRevocationController } from './certificates-revocation.controller';
import { CertificatesRevocationService } from './certificates-revocation.service';
import { Certificate } from './entities/certificate.entity';
import { Verification } from '../../certificate/entities/verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Verification])],
  controllers: [CertificatesController, CertificatesVerificationController, CertificatesRevocationController],
  providers: [CertificatesService, CertificatesVerificationService, CertificatesRevocationService],
})
export class CertificatesModule {}
