import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  generateCertificate(cert: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 72 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .rect(36, 36, doc.page.width - 72, doc.page.height - 72)
        .stroke('#c0a060');

      doc.moveDown(3);

      doc
        .fontSize(30)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text('Certificate of Achievement', { align: 'center' });

      doc.moveDown(1.5);

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text('This certifies that', { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text(cert.recipientName ?? cert.recipient?.name ?? 'N/A', { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`has successfully completed`, { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(cert.title ?? 'N/A', { align: 'center' });

      doc.moveDown(1.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Certificate ID: ${cert.id}`, { align: 'center' })
        .text(`Issued by: ${cert.issuer?.name ?? cert.issuerId ?? 'N/A'}`, { align: 'center' })
        .text(`Date Issued: ${new Date(cert.issuedAt).toLocaleDateString()}`, { align: 'center' });

      if (cert.expiresAt) {
        doc.text(`Expiry Date: ${new Date(cert.expiresAt).toLocaleDateString()}`, { align: 'center' });
      }

      doc.moveDown(0.8);

      doc
        .fontSize(10)
        .fillColor('#888888')
        .text(`Status: ${cert.status ?? 'active'}`, { align: 'center' });

      doc.end();
    });
  }
}
