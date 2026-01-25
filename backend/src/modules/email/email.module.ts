import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailQueueService } from './email-queue.service';
import { EmailQueueProcessor, EMAIL_QUEUE_NAME } from './email-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailQueueService, EmailQueueProcessor],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
