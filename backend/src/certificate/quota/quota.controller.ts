import { Controller, Post, Body, Param } from '@nestjs/common';
import { QuotaService } from './services/quota.service';

@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Post(':issuerId/issue')
  async issueCertificate(@Param('issuerId') issuerId: string) {
    return this.quotaService.issueCertificate(issuerId);
  }
}
