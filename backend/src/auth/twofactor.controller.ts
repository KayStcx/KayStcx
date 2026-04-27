import { Controller, Post, Body, Req } from '@nestjs/common';
import { TwoFactorService } from './twofactor.service';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('generate')
  async generate(@Req() req) {
    const userId = req.user.id;
    return this.twoFactorService.generateSecret(userId);
  }

  @Post('enable')
  async enable(@Req() req, @Body('token') token: string) {
    const userId = req.user.id;
    return this.twoFactorService.enableTwoFactor(userId, token);
  }

  @Post('disable')
  async disable(@Req() req) {
    const userId = req.user.id;
    return this.twoFactorService.disableTwoFactor(userId);
  }

  @Post('verify')
  async verify(@Req() req, @Body('token') token: string) {
    const userId = req.user.id;
    const valid = await this.twoFactorService.verifyTwoFactor(userId, token);
    return { valid };
  }
}
