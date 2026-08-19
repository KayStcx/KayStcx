import { useEffect, useState } from "react";
import { Snowflake } from "lucide-react";

interface FreezeCertificateModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (input: { reason: string; durationDays: number }) => void;
}

/**
 * Modal that captures the reason and freeze duration (days) before
 * temporarily freezing a certificate during a dispute.
 */
const FreezeCertificateModal = ({
  isOpen,
  isSubmitting = false,
  onClose,
  onConfirm,
}: FreezeCertificateModalProps) => {
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState(7);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setDurationDays(7);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Freeze certificate"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Snowflake className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold dark:text-white">
            Freeze Certificate
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This will temporarily freeze the certificate during a dispute. You
          can unfreeze it at any time.
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="freeze-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Reason for freezing
            </label>
            <textarea
              id="freeze-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Enter the reason for freezing..."
            />
          </div>
          <div>
            <label
              htmlFor="freeze-duration"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Freeze Duration (days)
            </label>
            <input
              id="freeze-duration"
              type="number"
              min={1}
              max={90}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum 90 days. Leave empty for indefinite.
            </p>
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
            onClick={() => onConfirm({ reason, durationDays })}
            disabled={!reason || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Freezing..." : "Freeze"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreezeCertificateModal;
