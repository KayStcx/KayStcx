import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IssuerQuota } from '../entities/issuer-quota.entity';
import { IssuerQuotaUsage } from '../entities/issuer-quota-usage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QuotaExceededException } from '../../common/exceptions/quota-exceeded.exception';
import { QuotaEmailService } from './quota-email.service';

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(IssuerQuota)
    private quotaRepo: Repository<IssuerQuota>,
    @InjectRepository(IssuerQuotaUsage)
    private usageRepo: Repository<IssuerQuotaUsage>,
    private emailService: QuotaEmailService,
  ) {}

  async issueCertificate(issuerId: string): Promise<void> {
    const quota = await this.quotaRepo.findOneBy({ issuerId });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let usage = await this.usageRepo.findOneBy({ issuerId, month, year });
    if (!usage) {
      usage = this.usageRepo.create({ issuerId, month, year, issuedCount: 0 });
    }

    if (!quota.adminOverride) {
      if (usage.issuedCount >= quota.monthlyLimit) {
        throw new QuotaExceededException('Monthly quota exceeded');
      }
      if (usage.issuedCount >= quota.yearlyLimit) {
        throw new QuotaExceededException('Yearly quota exceeded');
      }
    }

    usage.issuedCount++;
    await this.usageRepo.save(usage);

    const threshold = Math.ceil(quota.monthlyLimit * (quota.warningThreshold / 100));
    if (usage.issuedCount >= threshold) {
      await this.emailService.sendWarning(issuerId, usage.issuedCount, quota.monthlyLimit);
    }
  }
}
