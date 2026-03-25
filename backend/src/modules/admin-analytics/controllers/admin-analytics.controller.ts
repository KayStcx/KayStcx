import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import {
  AdminAnalyticsQueryDto,
  AdminAnalyticsDto,
} from '../dto/admin-analytics.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  /**
   * Get platform-wide analytics for admin dashboard
   * Returns comprehensive statistics including:
   * - Total users by role
   * - All-issuer certificate counts
   * - System-wide verification trends
   * - Top issuers
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get admin analytics',
    description:
      'Retrieves platform-wide analytics for admin dashboard. Requires admin role.',
  })
  @ApiQuery({ type: AdminAnalyticsQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Admin analytics data retrieved successfully',
    type: AdminAnalyticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin role',
  })
  async getAnalytics(
    @Query() query: AdminAnalyticsQueryDto,
  ): Promise<AdminAnalyticsDto> {
    return this.analyticsService.getAnalytics(query);
  }

  /**
   * Clear analytics cache
   * Useful after bulk operations or data imports
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Clear analytics cache',
    description: 'Clears the cached analytics data. Requires admin role.',
  })
  @ApiResponse({
    status: 204,
    description: 'Cache cleared successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires admin role',
  })
  async clearCache(): Promise<void> {
    await this.analyticsService.clearCache();
  }
}
