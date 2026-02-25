import { Controller, Patch, Param, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CertificatesRevocationService } from './certificates-revocation.service';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';
import { Certificate } from './entities/certificate.entity';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesRevocationController {
  private readonly logger = new Logger(CertificatesRevocationController.name);

  constructor(
    private readonly certificatesRevocationService: CertificatesRevocationService,
  ) {}

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Revoke a certificate',
    description: 'Allow authorized issuers to revoke certificates and reflect the revocation on-chain.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Certificate ID to revoke',
    example: 'cert_123456789'
  })
  @ApiBody({ 
    type: RevokeCertificateDto,
    description: 'Revocation reason (optional)'
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate successfully revoked',
    type: Certificate,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - user is not the original issuer or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - certificate already revoked or other validation errors',
  })
  async revokeCertificate(
    @Param('id') certificateId: string,
    @CurrentUser() user: User,
    @Body() revokeDto: RevokeCertificateDto,
  ): Promise<Certificate> {
    this.logger.log(`Received revocation request for certificate: ${certificateId} by user: ${user.id}`);
    
    try {
      const result = await this.certificatesRevocationService.revokeCertificate(
        certificateId,
        user,
        revokeDto.reason,
      );
      
      this.logger.log(`Certificate ${certificateId} successfully revoked by user ${user.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error revoking certificate ${certificateId}:`, error);
      throw error;
    }
  }
}