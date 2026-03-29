import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getCertificatePdfUrl, getUserCertificates } from "../api";
import QRCodeModal from "../components/QRCodeModal";
import {
  Wallet,
  Download,
  Eye,
  Clock,
  QrCode,
  Share2,
  Check,
} from "lucide-react";

interface CertShape {
  id: string;
  title: string;
  recipientName?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: "active" | "expired" | "revoked" | "frozen";
  serialNumber?: string;
  pdfUrl?: string;
}

const CertificateWallet: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [certificates, setCertificates] = useState<CertShape[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "expired" | "revoked" | "frozen"
  >("all");
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    certificateId?: string | null;
    certificateName?: string | null;
  }>({ isOpen: false, certificateId: null, certificateName: null });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getUserCertificates(user.id);
      setCertificates(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load certificates",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchCertificates();
    }
  }, [isAuthenticated, fetchCertificates]);

  const filtered =
    filter === "all"
      ? certificates
      : certificates.filter((certificate) => certificate.status === filter);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to view your certificate wallet.
          </p>
        </div>
      </div>
    );
  }

  const handleShowQR = (certificateId: string, certificateName?: string) => {
    setQrModal({
      isOpen: true,
      certificateId,
      certificateName: certificateName || "Certificate",
    });
  };

  const handleShare = async (certificate: CertShape) => {
    const serial = certificate.serialNumber || certificate.id;
    const url = `${window.location.origin}/verify?serial=${encodeURIComponent(serial)}`;

    const copyToClipboard = async () => {
      await navigator.clipboard.writeText(url);
      setCopiedId(certificate.id);
      setTimeout(() => setCopiedId(null), 2000);
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: certificate.title,
          text: `Check out my certificate: ${certificate.title}`,
          url,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          await copyToClipboard();
        }
      }
      return;
    }

    await copyToClipboard();
  };

  const handlePdfAction = async (
    certificate: CertShape,
    action: "view" | "download",
  ) => {
    setError(null);
    setActionLoadingId(certificate.id);
    try {
      const url = certificate.pdfUrl || (await getCertificatePdfUrl(certificate.id));
      if (!url) {
        throw new Error("PDF not found");
      }

      if (action === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("PDF unavailable");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Certificate-${certificate.serialNumber || certificate.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to ${action} certificate "${certificate.title}". ${message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Certificate Wallet</h1>
        <p className="mt-1 text-gray-600">
          Welcome, {user?.firstName || user?.email}
        </p>
      </div>

      <div className="mb-6 flex w-fit space-x-1 rounded-lg bg-gray-100 p-1">
        {(["all", "active", "expired", "revoked", "frozen"] as const).map(
          (value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === value
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {value}
            </button>
          ),
        )}
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => void fetchCertificates()}
            className="mt-2 text-sm text-red-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-lg bg-white py-12 text-center shadow-md">
          <Wallet className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-600">
            No Certificates Yet
          </h2>
          <p className="mt-2 text-gray-500">
            Your earned certificates will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((certificate) => (
            <div
              key={certificate.id}
              className="rounded-lg bg-white p-6 shadow-md"
            >
              <div className="mb-4 flex justify-between">
                <h3 className="text-xl font-semibold">{certificate.title}</h3>
                <span
                  className={`rounded px-2 py-1 text-sm ${
                    certificate.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {certificate.status}
                </span>
              </div>

              <div className="mb-6 space-y-2 text-gray-600">
                {certificate.recipientName && (
                  <p>Issued to: {certificate.recipientName}</p>
                )}
                {certificate.issueDate && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(certificate.issueDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => void handlePdfAction(certificate, "view")}
                  disabled={actionLoadingId === certificate.id}
                  className="flex items-center gap-2 text-blue-600 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" /> View
                </button>

                <button
                  onClick={() => handleShowQR(certificate.id, certificate.title)}
                  className="flex items-center gap-2 text-purple-600"
                >
                  <QrCode className="h-4 w-4" /> QR
                </button>

                <button
                  onClick={() => void handlePdfAction(certificate, "download")}
                  disabled={actionLoadingId === certificate.id}
                  className="flex items-center gap-2 text-green-600 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Download
                </button>

                <button
                  onClick={() => void handleShare(certificate)}
                  className="flex items-center gap-2 text-indigo-600"
                >
                  {copiedId === certificate.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copiedId === certificate.id ? "Copied!" : "Share"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <QRCodeModal
        isOpen={!!qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, certificateId: null })}
        certificateId={qrModal.certificateId ?? ""}
        certificateName={qrModal.certificateName ?? "Certificate"}
      />
    </div>
  );
};

export default CertificateWallet;
