import React from 'react';
import { Download, Mail } from 'lucide-react';

const CertificatePreview = () => {
  const certificateData = {
    title: 'Certificate of Excellence',
    recipient: 'Jordan Lewis',
    issuer: 'Kaystcx Institute',
    issueDate: 'February 23, 2026',
    description: 'For outstanding performance in the Blockchain Fundamentals program.',
  };

  const handleDownload = () => {
    console.log('Download PDF functionality here');
  };

  const handleShare = () => {
    console.log('Share via email functionality here');
  };

  return (
    <section className="space-y-8">
      <div className="print-certificate certificate-text rounded-[28px] border border-white/15 bg-white p-10 text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>{certificateData.issuer}</span>
          <span>Credential ID KX-2026-00023</span>
        </div>
        <h3 className="mt-10 text-center text-3xl font-bold">{certificateData.title}</h3>
        <p className="mt-6 text-center text-base text-slate-600">This certifies that</p>
        <h4 className="mt-4 text-center text-2xl font-semibold text-slate-800">{certificateData.recipient}</h4>
        <p className="mt-3 text-center text-sm text-slate-500">{certificateData.description}</p>
        <p className="mt-6 text-center text-xs text-slate-400">Issued {certificateData.issueDate}</p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" /> Download as PDF
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" /> Share via Email
        </button>
      </div>
    </section>
  );
};

export default CertificatePreview;