import { Injectable } from '@nestjs/common';

@Injectable()
export class QuotaEmailService {
  async sendWarning(issuerId: string, usage: number, limit: number) {
    // Integrate with your email provider (SendGrid, SES, etc.)
    console.log(`Warning: Issuer ${issuerId} has used ${usage}/${limit} certificates this month`);
  }
}
