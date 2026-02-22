import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
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
    ) { }

    @Process('deliver')
    async handleDelivery(job: Job) {
        const { subscriptionId, event, payload, attempt } = job.data;
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });

        if (!subscription || !subscription.isActive) {
            this.logger.warn(`Subscription ${subscriptionId} not found or inactive`);
            return;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.generateSignature(
            subscription.secret,
            timestamp,
            payload,
        );

        const startTime = Date.now();
        let statusCode: number = 0;
        let responseData: string = '';
        let isSuccess = false;

        try {
            const response = await axios.post(subscription.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Kaystcx-Event': event,
                    'X-Kaystcx-Signature': `t=${timestamp},v1=${signature}`,
                    'User-Agent': 'Kaystcx-Webhook/1.0',
                },
                timeout: 10000,
            });

            statusCode = response.status;
            responseData = JSON.stringify(response.data);
            isSuccess = true;
        } catch (error) {
            statusCode = error.response?.status || 500;
            responseData = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;

            this.logger.error(
                `Webhook delivery failed for ${subscription.url}: ${error.message}`,
            );

            // Rethrow to trigger Bull retry if it's not the last attempt
            if (attempt < job.opts.attempts) {
                job.data.attempt = attempt + 1;
                throw error;
            }
        } finally {
            const duration = Date.now() - startTime;

            await this.logRepository.save({
                subscriptionId,
                event,
                payload,
                statusCode,
                response: responseData,
                duration,
                attempt,
                isSuccess,
            });
        }
    }

    private generateSignature(secret: string, timestamp: number, payload: any): string {
        const rawPayload = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', secret)
            .update(`${timestamp}.${rawPayload}`)
            .digest('hex');
    }
}
