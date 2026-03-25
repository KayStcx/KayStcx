import { useEffect, useState } from 'react';
import { Wallet, Download, Eye, Clock, AlertCircle } from 'lucide-react';
import { Certificate, getUserCertificates, getCertificatePdfUrl } from '../api';

const CertificateWallet = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // const userId = "b3a1863c-15a9-4df1-989e-a9d4e4f3840e";
  useEffect(() => {
    const user = localStorage.getItem('user');

    if (!user) {
      setLoading(false);
      return;
    }

    const parsedUser = JSON.parse(user); // Parse the stored string into an object

    const fetchCertificates = async () => {
      try {
        const data = await getUserCertificates(parsedUser.id);
        if (data) {
          setCertificates(data);
        }
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const handlePdfAction = async (cert: Certificate, action: 'view' | 'download') => {
    setError(null);
    setActionLoadingId(cert.id);

    try {
      let url: string | undefined | null = cert.pdfUrl;
      
      if (!url) {
        url = await getCertificatePdfUrl(cert.id);
      }

      if (!url) {
        throw new Error('PDF not found');
      }

      if (action === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const fetchRes = await fetch(url);
        if (!fetchRes.ok) {
           throw new Error('PDF file is currently unavailable');
        }
        const blob = await fetchRes.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `Certificate-${cert.serialNumber || cert.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch (err: unknown) {
      console.error(`Error with PDF for ${cert.id}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'The PDF is unavailable.';
      setError(`Failed to ${action} certificate "${cert.title}". ${errorMessage}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Wallet className="w-10 h-10 text-blue-600" />
        <h1 className="text-3xl font-bold">Certificate Wallet</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificates...</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">No Certificates Yet</h2>
          <p className="text-gray-500 mt-2">Your earned certificates will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{cert.title}</h3>
                <span className={`px-2 py-1 rounded text-sm ${cert.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {cert.status}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-gray-600">Issued to: {cert.recipientName}</p>
                <p className="text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(cert.issueDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => handlePdfAction(cert, 'view')}
                  disabled={actionLoadingId === cert.id}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handlePdfAction(cert, 'download')}
                  disabled={actionLoadingId === cert.id}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificateWallet;