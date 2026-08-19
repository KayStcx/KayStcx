import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { InitiateTransferDto } from "../../../api";

interface TransferCertificateModalProps {
  isOpen: boolean;
  certificateId: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (input: InitiateTransferDto) => void;
}

/**
 * Modal that collects the new owner details and triggers a transfer of
 * certificate ownership. The new owner must approve the transfer before
 * the swap is final.
 */
const TransferCertificateModal = ({
  isOpen,
  certificateId,
  isSubmitting = false,
  onClose,
  onConfirm,
}: TransferCertificateModalProps) => {
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewOwnerName("");
      setNewOwnerEmail("");
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen || !certificateId) return null;

  const canSubmit = !!newOwnerEmail && !!newOwnerName && !isSubmitting;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Initiate certificate transfer"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold dark:text-white">
            Initiate Transfer
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Transfer ownership of this certificate to a new recipient. The new
          owner will need to approve the transfer.
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="transfer-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Owner Name
            </label>
            <input
              id="transfer-name"
              type="text"
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Recipient's full name"
              required
            />
          </div>
          <div>
            <label
              htmlFor="transfer-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Owner Email
            </label>
            <input
              id="transfer-email"
              type="email"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="recipient@example.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="transfer-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Reason (Optional)
            </label>
            <textarea
              id="transfer-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="e.g., Correction of name, change of ownership..."
            />
          </div>
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
            onClick={() =>
              onConfirm({
                certificateId,
                newOwnerName,
                newOwnerEmail,
                reason: reason || undefined,
              })
            }
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Initiate Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferCertificateModal;
