import { Controller, Get, Headers, HttpException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitService } from './rate-limit.service';

@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get('usage')
  @Public()
  async getUsage(@Headers('x-api-key') apiKey?: string) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new HttpException('Missing x-api-key header', 401);
    }

    const usage = await this.rateLimitService.getUsage(apiKey);

    const shouldUpgrade = usage.tier === 'free' && usage.remaining <= Math.max(Math.floor(usage.limit * 0.2), 1);

    return {
      ...usage,
      recommendedTier: usage.tier === 'free' ? 'paid' : usage.tier,
      upgradeNotification: shouldUpgrade
        ? '이용량이 임박했습니다. paid 티어로 업그레이드하면 한도와 처리량이 늘어납니다.'
        : null,
    };
  }
}
