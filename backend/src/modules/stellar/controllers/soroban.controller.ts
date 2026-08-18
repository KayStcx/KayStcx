import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SorobanService } from '../services/soroban.service';
import { JwtAuthGuard } from 'src/common';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { LoggingService } from '../../../common/logging/logging.service';
import {
  SorobanException,
  SorobanNotFoundException,
} from '../exceptions/soroban.exception';

@ApiTags('Soroban')
@Controller('soroban')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SorobanController {
  constructor(
    private readonly sorobanService: SorobanService,
    private readonly logger: LoggingService,
  ) {}

  @Post('initialize-contract')
  @ApiOperation({ summary: 'Initialize the certificate contract' })
  @ApiResponse({
    status: 200,
    description: 'Contract initialized successfully',
  })
  @ApiResponse({ status: 500, description: 'Failed to initialize contract' })
  async initializeContract(@Body() body: { adminAddress: string }) {
    try {
      await this.sorobanService.initializeCertificateContract(
        body.adminAddress,
      );
      return {
        success: true,
        message: 'Certificate contract initialized successfully',
      };
    } catch (error: unknown) {
      return this.handleError(error, 'Contract initialization');
    }
  }

  @Post('add-issuer')
  @ApiOperation({ summary: 'Add an authorized issuer to the contract' })
  @ApiResponse({ status: 200, description: 'Issuer added successfully' })
  async addIssuer(@Body() body: { issuerAddress: string }) {
    try {
      await this.sorobanService.addIssuer(body.issuerAddress);
      return {
        success: true,
        message: 'Issuer added to contract successfully',
      };
    } catch (error: unknown) {
      return this.handleError(error, 'Add issuer');
    }
  }

  @Post('init-multisig')
  @ApiOperation({ summary: 'Initialize multisig configuration for an issuer' })
  @ApiResponse({
    status: 200,
    description: 'Multisig initialized successfully',
  })
  async initMultisig(
    @Body()
    body: {
      issuerAddress: string;
      threshold: number;
      signers: string[];
      maxSigners: number;
    },
  ) {
    try {
      await this.sorobanService.initMultisigConfig(
        body.issuerAddress,
        body.threshold,
        body.signers,
        body.maxSigners,
      );
      return {
        success: true,
        message: 'Multisig configuration initialized successfully',
      };
    } catch (error: unknown) {
      return this.handleError(error, 'Multisig initialization');
    }
  }

  @Get('certificate/:id')
  @ApiOperation({ summary: 'Get certificate data from the contract' })
  @ApiResponse({ status: 200, description: 'Certificate data retrieved' })
  async getCertificate(@Param('id') id: string) {
    try {
      const certificate = await this.sorobanService.getCertificate(id);
      return {
        success: true,
        data: certificate,
      };
    } catch (error: unknown) {
      if (error instanceof SorobanNotFoundException) {
        return {
          success: false,
          message: 'Certificate not found on-chain',
        };
      }
      return this.handleError(error, 'Get certificate');
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Check Soroban service status' })
  @ApiResponse({ status: 200, description: 'Service status' })
  getStatus() {
    return {
      configured: this.sorobanService.isConfigured(),
      message: this.sorobanService.isConfigured()
        ? 'Soroban service is properly configured'
        : 'Soroban service is not configured',
    };
  }

  private handleError(error: unknown, operation: string) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof SorobanException ? error.code : undefined;
    this.logger.error(`${operation} error: ${message}`, error);
    return {
      success: false,
      message: `${operation} failed: ${message}`,
      ...(code && { code }),
    };
  }
}
