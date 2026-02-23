import { Injectable } from '@nestjs/common';

const CSV_HEADERS = [
  'id',
  'recipientName',
  'recipientEmail',
  'issuerName',
  'title',
  'status',
  'issuedAt',
  'expiresAt',
];

@Injectable()
export class CsvService {
  generateCsv(certs: any[]): Buffer {
    const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = certs.map((c) =>
      CSV_HEADERS.map((h) => {
        if (h === 'issuerName') return escape(c.issuer?.name ?? c.issuerId ?? '');
        if (h === 'recipientName') return escape(c.recipient?.name ?? c.recipientName ?? '');
        if (h === 'recipientEmail') return escape(c.recipient?.email ?? c.recipientEmail ?? '');
        return escape(c[h]);
      }).join(','),
    );

    return Buffer.from([CSV_HEADERS.join(','), ...rows].join('\n'), 'utf-8');
  }

  generateJson(certs: any[]): Buffer {
    const data = certs.map((c) => ({
      id: c.id,
      recipientName: c.recipient?.name ?? c.recipientName ?? '',
      recipientEmail: c.recipient?.email ?? c.recipientEmail ?? '',
      issuerName: c.issuer?.name ?? c.issuerId ?? '',
      title: c.title ?? '',
      status: c.status ?? '',
      issuedAt: c.issuedAt ?? '',
      expiresAt: c.expiresAt ?? null,
    }));

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }
}
