import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';

@Controller('certificates')
export class CertificateController {
  @Post('create')
  async createCertificate(@Body() body: any) {
    const bodySize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    if (bodySize > 100 * 1024) {
      throw new BadRequestException('Request body too large for certificate creation');
    }

    // proceed with certificate generation
  }
}
