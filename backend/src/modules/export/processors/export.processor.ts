import { Processor, Process } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import { ExportJob } from '../entities/export-job.entity';
import { Certificate } from '../../certificates/entities/certificate.entity';
import { PdfService } from '../services/pdf.service';
import { CsvService } from '../services/csv.service';
import { ExportMailService } from '../services/export-mail.service';

export const EXPORT_QUEUE = 'export';

@Processor(EXPORT_QUEUE)
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);
  private readonly outputDir = path.join(process.cwd(), 'uploads', 'exports');

  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepo: Repository<ExportJob>,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    private readonly pdfService: PdfService,
    private readonly csvService: CsvService,
    private readonly mailService: ExportMailService,
  ) {
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  @Process('generate')
  async handleGenerate(job: Job<{ jobId: string }>) {
    const exportJob = await this.exportJobRepo.findOne({ where: { id: job.data.jobId } });
    if (!exportJob) return;

    await this.exportJobRepo.update(exportJob.id, { status: 'processing' });

    try {
      const certificates = await this.fetchCertificates(exportJob);

      const fileName = `export-${exportJob.id}.${exportJob.format}`;
      const filePath = path.join(this.outputDir, fileName);

      if (exportJob.format === 'pdf') {
        const buffer = await this.pdfService.generateCertificate(certificates[0]);
        fs.writeFileSync(filePath, buffer);
      } else if (exportJob.format === 'csv') {
        fs.writeFileSync(filePath, this.csvService.generateCsv(certificates));
      } else {
        fs.writeFileSync(filePath, this.csvService.generateJson(certificates));
      }

      await this.exportJobRepo.update(exportJob.id, {
        status: 'completed',
        filePath,
        completedAt: new Date(),
      });

      const downloadUrl = `${process.env.APP_URL}/export/download/${exportJob.id}`;
      await this.mailService.sendDownloadLink(exportJob.requesterEmail, downloadUrl, exportJob.format);

      this.logger.log(`Export job ${exportJob.id} completed (${certificates.length} records)`);
    } catch (err) {
      this.logger.error(`Export job ${exportJob.id} failed: ${err.message}`);
      await this.exportJobRepo.update(exportJob.id, {
        status: 'failed',
        errorMessage: err.message,
      });
    }
  }

  private async fetchCertificates(exportJob: ExportJob): Promise<Certificate[]> {
    if (exportJob.type === 'single' && exportJob.certificateId) {
      const cert = await this.certificateRepo.findOne({
        where: { id: exportJob.certificateId },
        relations: ['issuer', 'recipient'],
      });
      return cert ? [cert] : [];
    }

    const qb = this.certificateRepo
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.issuer', 'issuer')
      .leftJoinAndSelect('cert.recipient', 'recipient');

    const { status, issuerId, from, to } = exportJob.filters ?? {};

    if (status) qb.andWhere('cert.status = :status', { status });
    if (issuerId) qb.andWhere('cert.issuerId = :issuerId', { issuerId });
    if (from) qb.andWhere('cert.issuedAt >= :from', { from });
    if (to) qb.andWhere('cert.issuedAt <= :to', { to });

    return qb.getMany();
  }
}
