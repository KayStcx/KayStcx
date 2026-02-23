import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import * as fs from 'fs';
import { ExportJob } from './entities/export-job.entity';
import { CreateExportDto } from './dto/create-export.dto';
import { EXPORT_QUEUE } from './processors/export.processor';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepo: Repository<ExportJob>,
    @InjectQueue(EXPORT_QUEUE)
    private readonly exportQueue: Queue,
  ) {}

  async createSingleExport(certificateId: string, dto: CreateExportDto) {
    const job = await this.exportJobRepo.save(
      this.exportJobRepo.create({
        requesterEmail: dto.requesterEmail,
        format: 'pdf',
        type: 'single',
        certificateId,
        status: 'pending',
      }),
    );

    await this.exportQueue.add('generate', { jobId: job.id });
    return { jobId: job.id, status: job.status };
  }

  async createBulkExport(dto: CreateExportDto) {
    const job = await this.exportJobRepo.save(
      this.exportJobRepo.create({
        requesterEmail: dto.requesterEmail,
        format: dto.format ?? 'csv',
        type: 'bulk',
        status: 'pending',
        filters: {
          status: dto.status,
          from: dto.from,
          to: dto.to,
          issuerId: dto.issuerId,
        },
      }),
    );

    await this.exportQueue.add('generate', { jobId: job.id });
    return { jobId: job.id, status: job.status };
  }

  async getJobStatus(jobId: string) {
    const job = await this.exportJobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Export job not found');
    return job;
  }

  async getHistory(requesterEmail: string) {
    return this.exportJobRepo.find({
      where: { requesterEmail },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getFileForDownload(jobId: string) {
    const job = await this.exportJobRepo.findOne({ where: { id: jobId } });

    if (!job || job.status !== 'completed' || !job.filePath) {
      throw new NotFoundException('File not available');
    }

    if (!fs.existsSync(job.filePath)) {
      throw new NotFoundException('File no longer exists on server');
    }

    return { filePath: job.filePath, format: job.format };
  }
}
