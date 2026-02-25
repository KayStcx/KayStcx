import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as crypto from 'crypto';
import {
    WebhookSubscription,
    WebhookEvent,
} from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        @InjectRepository(WebhookSubscription)
        private readonly subscriptionRepository: Repository<WebhookSubscription>,
        @InjectRepository(WebhookLog)
        private readonly logRepository: Repository<WebhookLog>,
        @InjectQueue('webhooks') private readonly webhookQueue: Queue,
    ) { }

    async createSubscription(
        issuerId: string,
        dto: CreateWebhookSubscriptionDto,
    ): Promise<WebhookSubscription> {
        const secret = crypto.randomBytes(32).toString('hex');
        const subscription = this.subscriptionRepository.create({
            ...dto,
            issuerId,
            secret,
        });
        return this.subscriptionRepository.save(subscription);
    }

    async findAll(issuerId: string): Promise<WebhookSubscription[]> {
        return this.subscriptionRepository.find({
            where: { issuerId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, issuerId: string): Promise<WebhookSubscription> {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id, issuerId },
        });
        if (!subscription) {
            throw new NotFoundException('Webhook subscription not found');
        }
        return subscription;
    }

    async remove(id: string, issuerId: string): Promise<void> {
        const subscription = await this.findOne(id, issuerId);
        await this.subscriptionRepository.remove(subscription);
    }

    async triggerEvent(event: WebhookEvent, issuerId: string, payload: any) {
        const subscriptions = await this.subscriptionRepository.find({
            where: { issuerId, isActive: true },
        });

        const relevantSubs = subscriptions.filter((sub) =>
            sub.events.includes(event),
        );

        for (const sub of relevantSubs) {
            await this.triggerEventForSubscription(sub, event, payload);
        }

        if (relevantSubs.length > 0) {
            this.logger.log(`Queued ${relevantSubs.length} webhooks for event ${event}`);
        }
    }

    async triggerEventForSubscription(
        subscription: WebhookSubscription,
        event: WebhookEvent,
        payload: any,
    ) {
        await this.webhookQueue.add(
            'deliver',
            {
                subscriptionId: subscription.id,
                event,
                payload,
                attempt: 1,
            },
            {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
            },
        );
    }

    async getLogs(subscriptionId: string, issuerId: string): Promise<WebhookLog[]> {
        await this.findOne(subscriptionId, issuerId); // Verify ownership
        return this.logRepository.find({
            where: { subscriptionId },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
}
