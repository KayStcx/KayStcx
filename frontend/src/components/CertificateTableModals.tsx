import { Snowflake, AlertTriangle, Send, History, XCircle } from 'lucide-react';
import type { ActivityItem } from '../api';

interface FreezeCertificateModalProps {
  reason: string;
  duration: number;
  isFreezing: boolean;
  error: string | null;
  onReasonChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FreezeCertificateModal({
  reason,
  duration,
  isFreezing,
  error,
  onReasonChange,
  onDurationChange,
  onCancel,
  onConfirm,
}: FreezeCertificateModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Snowflake className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold dark:text-white">Freeze Certificate</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This will temporarily freeze the certificate during a dispute. You can unfreeze it at any time.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for freezing
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Enter the reason for freezing..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Freeze Duration (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Between 1 and 90 days.</p>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isFreezing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason || isFreezing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isFreezing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Freezing…
              </>
            ) : (
              'Freeze'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RevokeCertificateModalProps {
  count: number;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RevokeCertificateModal({
  count,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: RevokeCertificateModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold dark:text-white">
            Revoke Certificate{count > 1 ? 's' : ''}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to revoke {count} certificate{count > 1 ? 's' : ''}? This action cannot be undone.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason for revocation
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            placeholder="Enter the reason for revocation..."
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

export interface TransferData {
  certificateId: string;
  newOwnerEmail: string;
  newOwnerName: string;
  reason: string;
}

interface TransferCertificateModalProps {
  data: TransferData;
  onDataChange: (data: TransferData) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TransferCertificateModal({
  data,
  onDataChange,
  onCancel,
  onConfirm,
}: TransferCertificateModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold dark:text-white">Initiate Transfer</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Transfer ownership of this certificate to a new recipient. The new owner will need to approve the transfer.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Owner Name
            </label>
            <input
              type="text"
              value={data.newOwnerName}
              onChange={(e) => onDataChange({ ...data, newOwnerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Recipient's full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Owner Email
            </label>
            <input
              type="email"
              value={data.newOwnerEmail}
              onChange={(e) => onDataChange({ ...data, newOwnerEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="recipient@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={data.reason}
              onChange={(e) => onDataChange({ ...data, reason: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="e.g., Correction of name, change of ownership..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!data.newOwnerEmail || !data.newOwnerName}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Initiate Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

interface CertificateHistoryModalProps {
  loading: boolean;
  history: ActivityItem[];
  onClose: () => void;
}

export function CertificateHistoryModal({
  loading,
  history,
  onClose,
}: CertificateHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold dark:text-white">Certificate History</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : history.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No history found for this certificate.
          </p>
        ) : (
          <div className="space-y-6">
            {history.map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5"></div>
                  {index !== history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 dark:bg-slate-700 my-1"></div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium dark:text-white capitalize">
                    {item.type.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
