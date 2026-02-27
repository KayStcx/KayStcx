import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsService } from './services/jobs.service';
import { JobsProcessor } from './services/jobs.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'certificate-jobs',
    }),
  ],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
