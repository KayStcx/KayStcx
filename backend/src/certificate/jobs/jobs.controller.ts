import { Controller, Post, Body } from '@nestjs/common';
import { JobsService } from './services/jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('email')
  async enqueueEmail(@Body() payload: any) {
    return this.jobsService.enqueueEmailJob(payload);
  }

  @Post('pdf')
  async enqueuePdf(@Body() payload: any) {
    return this.jobsService.enqueuePdfJob(payload);
  }
}
