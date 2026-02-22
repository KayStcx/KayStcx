import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import {
  DuplicateCheckResult,
  DuplicateReport,
  OverrideRequest,
  DuplicateDetectionConfig,
} from '../interfaces/duplicate-detection.interface';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';

@ApiTags('duplicate-detection')
@Controller('duplicate-detection')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DuplicateDetectionController {
  constructor(
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check for potential duplicate certificates' })
  @ApiResponse({ status: 200, description: 'Duplicate check result' })
  async checkDuplicates(
    @Body() certificateData: any,
    @Body('config') config: DuplicateDetectionConfig,
  ): Promise<DuplicateCheckResult> {
    return this.duplicateDetectionService.checkForDuplicates(certificateData, config);
  }

  @Get('report')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate duplicate report for admins' })
  @ApiResponse({ status: 200, description: 'Duplicate report generated' })
  async generateReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<DuplicateReport> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.duplicateDetectionService.generateDuplicateReport(start, end);
  }

  @Post('override-request')
  @ApiOperation({ summary: 'Create an override request for duplicate certificate' })
  @ApiResponse({ status: 201, description: 'Override request created' })
  async createOverrideRequest(
    @Body() body: {
      certificateId: string;
      reason: string;
      requestedBy: string;
    },
  ): Promise<OverrideRequest> {
    return this.duplicateDetectionService.createOverrideRequest(
      body.certificateId,
      body.reason,
      body.requestedBy,
    );
  }

  @Post('override-request/:requestId/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve an override request' })
  @ApiResponse({ status: 200, description: 'Override request approved' })
  async approveOverrideRequest(
    @Param('requestId') requestId: string,
    @Body('approvedBy') approvedBy: string,
  ): Promise<OverrideRequest> {
    return this.duplicateDetectionService.approveOverrideRequest(requestId, approvedBy);
  }
}
