import {
  Check,
  FileText,
  History,
  Snowflake,
  Send,
  XCircle,
} from "lucide-react";
import type { Certificate } from "../../api";
import StatusBadge from "./StatusBadge";

interface CertificateTableRowProps {
  certificate: Certificate;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onFreeze: (cert: Certificate) => void;
  onUnfreeze: (cert: Certificate) => void;
  onRevoke: (cert: Certificate) => void;
  onTransfer: (cert: Certificate) => void;
  onViewHistory: (cert: Certificate) => void;
  onViewCertificate: (cert: Certificate) => void;
}

/**
 * One row of the certificate table, including its action buttons. Extracted
 * from the table so it can be unit tested independently and so that the
 * table file stays focused on layout rather than icon definitions.
 */
const CertificateTableRow = ({
  certificate,
  isSelected,
  onToggleSelect,
  onFreeze,
  onUnfreeze,
  onRevoke,
  onTransfer,
  onViewHistory,
  onViewCertificate,
}: CertificateTableRowProps) => {
  const { id, status } = certificate;
  const canFreeze = status !== "frozen" && status !== "revoked";
  const canRevoke = status !== "revoked";
  const canTransfer = status === "active";

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-800">
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          aria-label={`Select certificate ${certificate.serialNumber}`}
          checked={isSelected}
          onChange={() => onToggleSelect(id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
        {certificate.serialNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {certificate.recipientName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {certificate.title}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {certificate.issuerName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {new Date(certificate.issueDate).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onFreeze(certificate)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            title="Freeze Certificate"
            disabled={!canFreeze}
          >
            <Snowflake className="w-5 h-5" />
          </button>
          {status === "frozen" && (
            <button
              type="button"
              onClick={() => onUnfreeze(certificate)}
              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              title="Unfreeze Certificate"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRevoke(certificate)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Revoke Certificate"
            disabled={!canRevoke}
          >
            <XCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onTransfer(certificate)}
            className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
            title="Transfer Certificate"
            disabled={!canTransfer}
          >
            <Send className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onViewHistory(certificate)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            title="View History"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onViewCertificate(certificate)}
            className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            title="View Certificate"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default CertificateTableRow;
