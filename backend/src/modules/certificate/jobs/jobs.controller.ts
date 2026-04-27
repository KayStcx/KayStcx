import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './services/jobs.service';
import { EnqueueEmailDto, EnqueuePdfDto } from './dto/create-job.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('email')
  @ApiOperation({ summary: 'Enqueue an email job' })
  @ApiResponse({ status: 201, description: 'Email job enqueued successfully' })
  async enqueueEmail(@Body() payload: EnqueueEmailDto) {
    return this.jobsService.enqueueEmailJob(payload);
  }

  @Post('pdf')
  @ApiOperation({ summary: 'Enqueue a PDF generation job' })
  @ApiResponse({ status: 201, description: 'PDF job enqueued successfully' })
  async enqueuePdf(@Body() payload: EnqueuePdfDto) {
    return this.jobsService.enqueuePdfJob(payload);
  }
}
