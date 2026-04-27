import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly repo: Repository<ApiKey>) {}

  async generateKey(owner: string, rateLimit = 1000): Promise<ApiKey> {
    const key = randomBytes(32).toString('hex');
    const apiKey = this.repo.create({ key, owner, rateLimit });
    return this.repo.save(apiKey);
  }

  async revokeKey(key: string): Promise<void> {
    await this.repo.update({ key }, { active: false });
  }

  async rotateKey(oldKey: string): Promise<ApiKey | null> {
    const existing = await this.repo.findOne({ where: { key: oldKey } });
    if (!existing) return null;
    existing.active = false;
    await this.repo.save(existing);
    return this.generateKey(existing.owner, existing.rateLimit);
  }

  async validateKey(key: string): Promise<ApiKey | null> {
    const apiKey = await this.repo.findOne({ where: { key, active: true } });
    if (!apiKey) return null;

    // Rate limit check
    if (apiKey.usageCount >= apiKey.rateLimit) return null;

    apiKey.usageCount += 1;
    apiKey.lastUsedAt = new Date();
    await this.repo.save(apiKey);

    return apiKey;
  }
}
