import React, { useState } from "react";
import { certificateApi } from "../api/endpoints";

interface VerificationResult {
  isValid: boolean;
  status: "authentic" | "invalid" | "revoked" | "expired";
  certificate?: {
    id: string;
    title: string;
    recipientName: string;
    issuerName: string;
    issuedDate: string;
    expiryDate?: string;
    credentialHash: string;
  };
  message?: string;
  verifiedAt?: string;
}

const Verify: React.FC = () => {
  const [certificateId, setCertificateId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    const trimmed = certificateId.trim();
    if (!trimmed) {
      setError("Please enter a Certificate ID or Hash.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await certificateApi.verify(trimmed);
      setResult(data as VerificationResult);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const styles: Record<
    string,
    { bg: string; border: string; text: string; icon: string; label: string }
  > = {
    authentic: {
      bg: "bg-green-50",
      border: "border-green-400",
      text: "text-green-800",
      icon: "OK",
      label: "Authentic",
    },
    invalid: {
      bg: "bg-red-50",
      border: "border-red-400",
      text: "text-red-800",
      icon: "X",
      label: "Invalid",
    },
    revoked: {
      bg: "bg-orange-50",
      border: "border-orange-400",
      text: "text-orange-800",
      icon: "!",
      label: "Revoked",
    },
    expired: {
      bg: "bg-yellow-50",
      border: "border-yellow-400",
      text: "text-yellow-800",
      icon: "!",
      label: "Expired",
    },
  };

  const style = result ? styles[result.status] || styles.invalid : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-900">
          Verify Certificate
        </h1>
        <p className="text-gray-600">
          Enter a certificate ID or credential hash to check its authenticity.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Certificate ID / Hash
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleVerify()}
            placeholder="e.g. CERT-2024-XXXXXXXX"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => void handleVerify()}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {result && style && (
          <div className={`mt-6 rounded-xl border-2 p-6 ${style.bg} ${style.border}`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">{style.icon}</span>
              <div>
                <h3 className={`text-xl font-bold ${style.text}`}>
                  {style.label}
                </h3>
                {result.verifiedAt && (
                  <p className="text-xs text-gray-500">
                    Verified at {new Date(result.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {result.message && (
              <p className="mb-4 text-sm text-gray-700">{result.message}</p>
            )}
            {result.certificate && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Title</span>
                  <p>{result.certificate.title}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Issuer</span>
                  <p>{result.certificate.issuerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Recipient</span>
                  <p>{result.certificate.recipientName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Issued</span>
                  <p>
                    {new Date(
                      result.certificate.issuedDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
                {result.certificate.expiryDate && (
                  <div>
                    <span className="font-medium text-gray-600">Expires</span>
                    <p>
                      {new Date(
                        result.certificate.expiryDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div className="col-span-2 border-t border-gray-200 pt-2">
                  <span className="text-xs font-medium text-gray-600">
                    Credential Hash
                  </span>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">
                    {result.certificate.credentialHash}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
