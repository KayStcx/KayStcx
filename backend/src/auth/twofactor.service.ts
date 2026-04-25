import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class TwoFactorService {
  constructor(private readonly userRepo: UserRepository) {}

  async generateSecret(userId: string) {
    const secret = speakeasy.generateSecret({ length: 20 });
    await this.userRepo.update(userId, { twoFactorSecret: secret.base32 });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode: qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, token: string) {
    const user = await this.userRepo.findById(userId);
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });
    if (!verified) throw new Error('Invalid 2FA token');

    await this.userRepo.update(userId, { twoFactorEnabled: true });
    return { enabled: true };
  }

  async disableTwoFactor(userId: string) {
    await this.userRepo.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    return { disabled: true };
  }

  async verifyTwoFactor(userId: string, token: string) {
    const user = await this.userRepo.findById(userId);
    if (!user.twoFactorEnabled) return false;

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });
  }
}
