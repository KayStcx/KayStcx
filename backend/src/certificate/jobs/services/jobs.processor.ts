import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('certificate-jobs')
export class JobsProcessor {
  @Process('send-email')
  async handleEmail(job: Job) {
    console.log(`Sending email with payload:`, job.data);
    // integrate with email service
  }

  @Process('generate-pdf')
  async handlePdf(job: Job) {
    console.log(`Generating PDF with payload:`, job.data);
    // integrate with PDF generator
  }

  @Process('expiration-check')
  async handleExpiration(job: Job) {
    console.log(`Running expiration check...`);
    // implement certificate expiration logic
  }
}
