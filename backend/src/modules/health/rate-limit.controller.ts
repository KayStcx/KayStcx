import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RateLimitService } from '../../common/rate-limiting/rate-limit.service';

@ApiTags('rate-limit')
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get('usage')
  @ApiOperation({
    summary: 'Get current rate limit usage by issuer and route',
  })
  @ApiResponse({
    status: 200,
    description: 'Current rate limit usage',
  })
  getUsage() {
    return {
      windowMs: this.rateLimitService['windowMs'],
      data: this.rateLimitService.getUsageSummary(),
    };
  }
}
