export const CERTIFICATE_INDEX = 'certificates';

export const CERTIFICATE_INDEX_CONFIG = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      recipientName: { type: 'text', analyzer: 'autocomplete_analyzer' },
      recipientEmail: { type: 'keyword' },
      issuerName: { type: 'text', analyzer: 'autocomplete_analyzer' },
      issuerId: { type: 'keyword' },
      title: { type: 'text', analyzer: 'autocomplete_analyzer' },
      description: { type: 'text' },
      status: { type: 'keyword' },
      issuedAt: { type: 'date' },
      expiresAt: { type: 'date' },
    },
  },
};
