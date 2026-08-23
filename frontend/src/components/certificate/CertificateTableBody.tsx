import type { Certificate } from "../../api";
import type {
  CertificateSortField,
  SortOrder,
} from "../../hooks/useCertificateTable";
import CertificateTableRow from "./CertificateTableRow";
import SortableHeader from "./SortableHeader";

interface CertificateTableBodyProps {
  loading: boolean;
  certificates: Certificate[];
  selectedIds: Set<string>;
  selectAll: boolean;
  onSelectAll: () => void;
  onSelect: (id: string) => void;
  sortBy: CertificateSortField;
  sortOrder: SortOrder;
  onSort: (field: CertificateSortField) => void;
  onFreeze: (cert: Certificate) => void;
  onUnfreeze: (cert: Certificate) => void;
  onRevoke: (cert: Certificate) => void;
  onTransfer: (cert: Certificate) => void;
  onViewHistory: (cert: Certificate) => void;
}

/**
 * Table head and body for the certificate management table. Renders the
 * loading and empty states plus one {@link CertificateTableRow} per
 * certificate.
 */
const CertificateTableBody = ({
  loading,
  certificates,
  selectedIds,
  selectAll,
  onSelectAll,
  onSelect,
  sortBy,
  sortOrder,
  onSort,
  onFreeze,
  onUnfreeze,
  onRevoke,
  onTransfer,
  onViewHistory,
}: CertificateTableBodyProps) => (
  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
    <thead className="bg-gray-50 dark:bg-slate-800">
      <tr>
        <th scope="col" className="px-6 py-3 text-left">
          <input
            type="checkbox"
            aria-label="Select all visible certificates"
            checked={selectAll}
            onChange={onSelectAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>
        <SortableHeader
          field="serialNumber"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Certificate ID
        </SortableHeader>
        <SortableHeader
          field="recipientName"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Recipient
        </SortableHeader>
        <SortableHeader
          field="title"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Title
        </SortableHeader>
        <SortableHeader
          field="issuerName"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Issuer
        </SortableHeader>
        <SortableHeader
          field="issueDate"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Issue Date
        </SortableHeader>
        <SortableHeader
          field="status"
          activeField={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        >
          Status
        </SortableHeader>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
        >
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
      {loading ? (
        <tr>
          <td
            colSpan={8}
            className="px-6 py-12 text-center text-gray-500 dark:text-slate-400"
          >
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3">Loading certificates...</span>
            </div>
          </td>
        </tr>
      ) : certificates.length === 0 ? (
        <tr>
          <td
            colSpan={8}
            className="px-6 py-12 text-center text-gray-500 dark:text-slate-400"
          >
            No certificates found
          </td>
        </tr>
      ) : (
        certificates.map((cert) => (
          <CertificateTableRow
            key={cert.id}
            certificate={cert}
            isSelected={selectedIds.has(cert.id)}
            onToggleSelect={onSelect}
            onFreeze={onFreeze}
            onUnfreeze={onUnfreeze}
            onRevoke={onRevoke}
            onTransfer={onTransfer}
            onViewHistory={onViewHistory}
            onViewCertificate={() => {
              /* No-op: certificate preview lives on its own route. */
            }}
          />
        ))
      )}
    </tbody>
  </table>
);

export default CertificateTableBody;
