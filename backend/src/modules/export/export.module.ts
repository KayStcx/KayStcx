import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Certificate } from '../certificates/entities/certificate.entity';
import { ExportJob } from './entities/export-job.entity';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ExportProcessor, EXPORT_QUEUE } from './processors/export.processor';
import { PdfService } from './services/pdf.service';
import { CsvService } from './services/csv.service';
import { ExportMailService } from './services/export-mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportJob, Certificate]),
    BullModule.registerQueue({ name: EXPORT_QUEUE }),
  ],
  providers: [ExportService, ExportProcessor, PdfService, CsvService, ExportMailService],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
