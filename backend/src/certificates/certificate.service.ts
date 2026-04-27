import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

@Injectable()
export class CertificateService {
  async generateCertificate(data: {
    name: string;
    courseTitle: string;
    grade?: string;
    date: string;
    signatureUrl: string;
  }): Promise<Buffer> {
    // Load template
    const templatePath = path.join(__dirname, 'templates', 'certificate.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    // Render HTML
    const html = template(data);

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    await browser.close();

    return pdfBuffer;
  }
}
