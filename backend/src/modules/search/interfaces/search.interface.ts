export interface CertificateDocument {
  id: string;
  recipientName: string;
  recipientEmail: string;
  issuerName: string;
  issuerId: string;
  title: string;
  description?: string;
  status: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface FacetBucket {
  key: string;
  count: number;
}

export interface SearchResult {
  total: number;
  page: number;
  limit: number;
  hits: CertificateDocument[];
  facets: {
    statuses: FacetBucket[];
    issuers: FacetBucket[];
  };
}
