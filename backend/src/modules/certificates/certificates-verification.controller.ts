import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CertificatesVerificationService } from './certificates-verification.service';
import { VerificationResultDto } from './dto/verification-result.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesVerificationController {
  private readonly logger = new Logger(CertificatesVerificationController.name);

  constructor(
    private readonly certificatesVerificationService: CertificatesVerificationService,
  ) {}

  @Get(':id/verify')
  @ApiOperation({ 
    summary: 'Verify a certificate',
    description: 'Public endpoint to verify certificate authenticity against Stellar blockchain records'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Certificate ID or verification code to verify',
    example: 'cert_123456789'
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate verification result',
    type: VerificationResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during verification',
  })
  async verifyCertificate(
    @Param('id') certificateId: string,
  ): Promise<VerificationResultDto> {
    this.logger.log(`Received verification request for certificate: ${certificateId}`);
    
    try {
      const result = await this.certificatesVerificationService.verifyCertificate(certificateId);
      this.logger.log(`Verification completed for ${certificateId}. Result: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Error verifying certificate ${certificateId}:`, error);
      throw error;
    }
  }
}