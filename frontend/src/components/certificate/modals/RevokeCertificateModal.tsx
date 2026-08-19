import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface RevokeCertificateModalProps {
  isOpen: boolean;
  certificateIds: string[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Modal that captures a revocation reason and confirms that the caller
 * really wants to revoke one or more certificates.
 */
const RevokeCertificateModal = ({
  isOpen,
  certificateIds,
  isSubmitting = false,
  onClose,
  onConfirm,
}: RevokeCertificateModalProps) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plural = certificateIds.length > 1;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Revoke certificates"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold dark:text-white">
            Revoke Certificate{plural ? "s" : ""}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to revoke {certificateIds.length} certificate
          {plural ? "s" : ""}? This action cannot be undone.
        </p>
        <div>
          <label
            htmlFor="revoke-reason"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Reason for revocation
          </label>
          <textarea
            id="revoke-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            placeholder="Enter the reason for revocation..."
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? "Revoking..." : "Revoke"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevokeCertificateModal;
