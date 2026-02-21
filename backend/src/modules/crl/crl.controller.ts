import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CRLService, RevocationReason, Pagination } from './crl.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/constants/roles';

class RevokeCertificateDto {
  certificateId: string;
  reason: RevocationReason;
  invalidityDate?: number;
}

class UpdateCRLMetadataDto {
  nextUpdate?: number;
  authorityKeyIdentifier?: string;
}

@Controller('crl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CRLController {
  private readonly logger = new Logger(CRLController.name);

  constructor(private readonly crlService: CRLService) {}

  @Post('initialize')
  @Roles(UserRole.ADMIN)
  async initializeCRL(@CurrentUser() user: User): Promise<{ transactionHash: string }> {
    try {
      const transactionHash = await this.crlService.initializeCRL(user.stellarPublicKey);
      return { transactionHash };
    } catch (error) {
      this.logger.error('Failed to initialize CRL', error);
      throw new HttpException(
        'Failed to initialize CRL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('revoke')
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  async revokeCertificate(
    @CurrentUser() user: User,
    @Body() revokeDto: RevokeCertificateDto,
  ): Promise<{ transactionHash: string }> {
    try {
      const transactionHash = await this.crlService.revokeCertificate(
        user.stellarPublicKey,
        revokeDto.certificateId,
        revokeDto.reason,
        revokeDto.invalidityDate,
      );
      return { transactionHash };
    } catch (error) {
      this.logger.error(`Failed to revoke certificate ${revokeDto.certificateId}`, error);
      if (error.message.includes('already revoked')) {
        throw new HttpException(
          'Certificate already revoked',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to revoke certificate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('revoke/:certificateId')
  @Roles(UserRole.ISSUER, UserRole.ADMIN)
  async unrevokeCertificate(
    @CurrentUser() user: User,
    @Param('certificateId') certificateId: string,
  ): Promise<{ transactionHash: string }> {
    try {
      const transactionHash = await this.crlService.unrevokeCertificate(
        user.stellarPublicKey,
        certificateId,
      );
      return { transactionHash };
    } catch (error) {
      this.logger.error(`Failed to unrevoke certificate ${certificateId}`, error);
      if (error.message.includes('not found in revocation list')) {
        throw new HttpException(
          'Certificate not found in revocation list',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to unrevoke certificate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('verify/:certificateId')
  async verifyCertificate(
    @Param('certificateId') certificateId: string,
  ): Promise<any> {
    try {
      const result = await this.crlService.verifyCertificate(certificateId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${certificateId}`, error);
      throw new HttpException(
        'Failed to verify certificate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revoked/:certificateId')
  async isRevoked(
    @Param('certificateId') certificateId: string,
  ): Promise<{ isRevoked: boolean }> {
    try {
      const isRevoked = await this.crlService.isCertificateRevoked(certificateId);
      return { isRevoked };
    } catch (error) {
      this.logger.error(`Failed to check revocation status for ${certificateId}`, error);
      throw new HttpException(
        'Failed to check revocation status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revoked-certificates')
  async getRevokedCertificates(
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    try {
      const pagination: Pagination = { page: Number(page), limit: Number(limit) };
      const result = await this.crlService.getRevokedCertificates(pagination);
      return result;
    } catch (error) {
      this.logger.error('Failed to get revoked certificates', error);
      throw new HttpException(
        'Failed to get revoked certificates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('info')
  async getCRLInfo(): Promise<any> {
    try {
      const crlInfo = await this.crlService.getCRLInfo();
      return crlInfo;
    } catch (error) {
      this.logger.error('Failed to get CRL info', error);
      throw new HttpException(
        'Failed to get CRL information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('count')
  async getRevokedCount(): Promise<{ count: number }> {
    try {
      const count = await this.crlService.getRevokedCount();
      return { count };
    } catch (error) {
      this.logger.error('Failed to get revoked count', error);
      throw new HttpException(
        'Failed to get revoked count',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('merkle-root')
  async getMerkleRoot(): Promise<{ merkleRoot: string | null }> {
    try {
      const merkleRoot = await this.crlService.getMerkleRoot();
      return { merkleRoot };
    } catch (error) {
      this.logger.error('Failed to get Merkle root', error);
      throw new HttpException(
        'Failed to get Merkle root',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('needs-update')
  async needsUpdate(): Promise<{ needsUpdate: boolean }> {
    try {
      const needsUpdate = await this.crlService.needsUpdate();
      return { needsUpdate };
    } catch (error) {
      this.logger.error('Failed to check if CRL needs update', error);
      throw new HttpException(
        'Failed to check update status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('update-metadata')
  @Roles(UserRole.ADMIN)
  async updateCRLMetadata(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateCRLMetadataDto,
  ): Promise<{ transactionHash: string }> {
    try {
      const transactionHash = await this.crlService.updateCRLMetadata(
        user.stellarPublicKey,
        updateDto.nextUpdate,
        updateDto.authorityKeyIdentifier,
      );
      return { transactionHash };
    } catch (error) {
      this.logger.error('Failed to update CRL metadata', error);
      throw new HttpException(
        'Failed to update CRL metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}