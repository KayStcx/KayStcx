import { History, XCircle } from "lucide-react";
import type { ActivityItem } from "../../../api";

interface CertificateHistoryModalProps {
  isOpen: boolean;
  loading: boolean;
  history: ActivityItem[];
  onClose: () => void;
}

/**
 * Modal that renders a vertical timeline of activity events (issue, verify,
 * revoke, …) for a single certificate.
 */
const CertificateHistoryModal = ({
  isOpen,
  loading,
  history,
  onClose,
}: CertificateHistoryModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate history"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold dark:text-white">
              Certificate History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            aria-label="Close history"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No history found for this certificate.
          </p>
        ) : (
          <ol className="space-y-6">
            {history.map((item, index) => (
              <li key={`${item.date}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5" />
                  {index !== history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 dark:bg-slate-700 my-1" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium dark:text-white capitalize">
                    {item.type.replace("_", " ")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateHistoryModal;
