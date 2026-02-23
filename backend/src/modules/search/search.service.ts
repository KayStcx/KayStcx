import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './providers/elasticsearch.provider';
import { CERTIFICATE_INDEX, CERTIFICATE_INDEX_CONFIG } from './constants/index.constants';
import { SearchQueryDto } from './dto/search-query.dto';
import { CertificateDocument, SearchResult } from './interfaces/search.interface';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly es: Client) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  async ensureIndex() {
    const exists = await this.es.indices.exists({ index: CERTIFICATE_INDEX });
    if (!exists) {
      await this.es.indices.create({
        index: CERTIFICATE_INDEX,
        ...CERTIFICATE_INDEX_CONFIG,
      });
      this.logger.log(`Index "${CERTIFICATE_INDEX}" created`);
    }
  }

  async indexCertificate(doc: CertificateDocument) {
    await this.es.index({
      index: CERTIFICATE_INDEX,
      id: doc.id,
      document: doc,
      refresh: true,
    });
  }

  async bulkIndex(docs: CertificateDocument[]) {
    if (!docs.length) return;

    const operations = docs.flatMap((doc) => [
      { index: { _index: CERTIFICATE_INDEX, _id: doc.id } },
      doc,
    ]);

    const response = await this.es.bulk({ operations, refresh: true });

    if (response.errors) {
      const failed = response.items.filter((i) => i.index?.error);
      this.logger.error(`Bulk index errors: ${failed.length} failed`);
    }
  }

  async deleteCertificate(id: string) {
    await this.es.delete({ index: CERTIFICATE_INDEX, id, refresh: true });
  }

  async search(query: SearchQueryDto): Promise<SearchResult> {
    const { q, issuerId, status, from, to, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const must: object[] = [];
    const filter: object[] = [];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['recipientName^3', 'issuerName^2', 'title^2', 'description', 'recipientEmail'],
          fuzziness: 'AUTO',
          prefix_length: 1,
          operator: 'or',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    if (issuerId) filter.push({ term: { issuerId } });
    if (status) filter.push({ term: { status } });

    if (from || to) {
      filter.push({
        range: {
          issuedAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        },
      });
    }

    const response = await this.es.search({
      index: CERTIFICATE_INDEX,
      from: offset,
      size: limit,
      query: { bool: { must, filter } },
      aggregations: {
        statuses: { terms: { field: 'status', size: 10 } },
        issuers: { terms: { field: 'issuerId', size: 20 } },
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total as { value: number })?.value ?? 0;

    const hits = response.hits.hits.map((h) => h._source as CertificateDocument);

    const aggs = response.aggregations as Record<string, { buckets: { key: string; doc_count: number }[] }>;

    return {
      total,
      page,
      limit,
      hits,
      facets: {
        statuses: aggs?.statuses?.buckets?.map((b) => ({ key: b.key, count: b.doc_count })) ?? [],
        issuers: aggs?.issuers?.buckets?.map((b) => ({ key: b.key, count: b.doc_count })) ?? [],
      },
    };
  }

  async dropAndRecreateIndex() {
    await this.es.indices.delete({ index: CERTIFICATE_INDEX, ignore_unavailable: true });
    await this.ensureIndex();
  }
}
