import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import axios from 'axios';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';

@Processor('webhooks')
export class WebhooksProcessor {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,

    @InjectRepository(WebhookLog)
    private readonly logRepository: Repository<WebhookLog>,
  ) {}

  @Process('deliver')
  async handleDelivery(job: Job) {
    const { subscriptionId, event, payload } = job.data;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription || !subscription.isActive) {
      this.logger.warn(`Invalid subscription ${subscriptionId}`);
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const signature = crypto
      .createHmac('sha256', subscription.secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');

    try {
      const res = await axios.post(subscription.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-StellarCert-Event': event,
          'X-StellarCert-Signature': `t=${timestamp},v1=${signature}`,
          'User-Agent': 'StellarCert-Webhook/1.0',
        },
        timeout: 10000,
      });

      await this.logRepository.save({
        subscriptionId,
        event,
        payload,
        statusCode: res.status,
        response: JSON.stringify(res.data),
        isSuccess: true,
      });
    } catch (err) {
      await this.logRepository.save({
        subscriptionId,
        event,
        payload,
        statusCode: err?.response?.status || 500,
        response: err.message,
        isSuccess: false,
      });

      this.logger.error(`Webhook failed: ${err.message}`);

      throw err; // triggers retry
    }
  }
}
