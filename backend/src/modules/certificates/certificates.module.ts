import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificatesVerificationController } from './certificates-verification.controller';
import { CertificatesVerificationService } from './certificates-verification.service';
import { Certificate } from './entities/certificate.entity';
import { Verification } from '../../certificate/entities/verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Verification])],
  controllers: [CertificatesController, CertificatesVerificationController],
  providers: [CertificatesService, CertificatesVerificationService],
})
export class CertificatesModule {}
