import { Client } from '@elastic/elasticsearch';

export const ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT';

export const ElasticsearchProvider = {
  provide: ELASTICSEARCH_CLIENT,
  useFactory: () =>
    new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
      auth:
        process.env.ELASTICSEARCH_USERNAME
          ? {
              username: process.env.ELASTICSEARCH_USERNAME,
              password: process.env.ELASTICSEARCH_PASSWORD ?? '',
            }
          : undefined,
    }),
};
