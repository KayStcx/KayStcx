import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([WebhookSubscription, WebhookLog]),
        BullModule.registerQueue({
            name: 'webhooks',
        }),
    ],
    controllers: [WebhooksController],
    providers: [WebhooksService, WebhooksProcessor],
    exports: [WebhooksService],
})
export class WebhooksModule { }
