import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../certificates/entities/certificate.entity';
import { SearchService } from './search.service';
import { CertificateDocument } from './interfaces/search.interface';

@Injectable()
export class ReindexService {
  private readonly logger = new Logger(ReindexService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    private readonly searchService: SearchService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledReindex() {
    this.logger.log('Scheduled re-index started');
    await this.reindex();
  }

  async reindex(): Promise<{ indexed: number }> {
    const certificates = await this.certificateRepo.find({
      relations: ['issuer', 'recipient'],
    });

    const docs: CertificateDocument[] = certificates.map((cert) =>
      this.toDocument(cert),
    );

    await this.searchService.dropAndRecreateIndex();
    await this.searchService.bulkIndex(docs);

    this.logger.log(`Re-indexed ${docs.length} certificates`);
    return { indexed: docs.length };
  }

  private toDocument(cert: Certificate): CertificateDocument {
    return {
      id: cert.id,
      recipientName: cert.recipientName ?? cert.recipient?.name ?? '',
      recipientEmail: cert.recipientEmail ?? cert.recipient?.email ?? '',
      issuerName: cert.issuer?.name ?? '',
      issuerId: cert.issuerId ?? cert.issuer?.id ?? '',
      title: cert.title ?? '',
      description: cert.description ?? '',
      status: cert.status ?? 'active',
      issuedAt: cert.issuedAt?.toISOString() ?? new Date().toISOString(),
      expiresAt: cert.expiresAt?.toISOString(),
    };
  }
}
