import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Res,
  StreamableFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  json: 'application/json',
};

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('certificate/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  exportSingle(@Param('id') id: string, @Body() dto: CreateExportDto) {
    return this.exportService.createSingleExport(id, dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  exportBulk(@Body() dto: CreateExportDto) {
    return this.exportService.createBulkExport(dto);
  }

  @Get('jobs/:id')
  getJobStatus(@Param('id') id: string) {
    return this.exportService.getJobStatus(id);
  }

  @Get('history')
  getHistory(@Query('email') email: string) {
    return this.exportService.getHistory(email);
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filePath, format } = await this.exportService.getFileForDownload(id);

    res.set({
      'Content-Type': MIME_TYPES[format] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="kaystcx-export.${format}"`,
    });

    return new StreamableFile(fs.createReadStream(filePath));
  }
}
