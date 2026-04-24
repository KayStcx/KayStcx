import { Module, forwardRef, Global } from '@nestjs/common'; // Add Global
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';
import { AuthModule } from '../auth/auth.module';

@Global() // Make it global so it's available everywhere without importing
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookLog]),
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    BullBoardModule.forFeature({
      name: 'webhooks',
      adapter: BullAdapter,
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
