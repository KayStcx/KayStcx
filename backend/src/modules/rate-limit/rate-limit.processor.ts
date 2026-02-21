import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { RATE_LIMIT_QUEUE } from './rate-limit.module';

export interface RateLimitExceededJob {
  apiKey: string;
  issuerId: string;
  tier: string;
  path: string;
  requestedAt: string;
}

@Processor(RATE_LIMIT_QUEUE)
@Injectable()
export class RateLimitQueueProcessor {
  private readonly logger = new Logger(RateLimitQueueProcessor.name);

  @Process('request-exceeded')
  async handleExceededRequest(job: Job<RateLimitExceededJob>): Promise<void> {
    const { apiKey, issuerId, tier, path, requestedAt } = job.data;
    this.logger.warn(
      `[RATE LIMIT EXCEEDED] apiKey=${apiKey} issuer=${issuerId} tier=${tier} path=${path} at=${requestedAt}`,
    );
  }

  @Process('failed')
  async handleFailedJob(job: Job): Promise<void> {
    this.logger.error(`Request exceeded job failed: ${job.id}, reason=${job.failedReason}`);
  }
}
