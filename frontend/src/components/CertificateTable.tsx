import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityItem, Certificate } from "../api";

import {
  useCertificateTable,
  type PageSize,
} from "../hooks/useCertificateTable";
import CertificateTableRow from "./certificate/CertificateTableRow";
import SortableHeader from "./certificate/SortableHeader";
import TableToolbar from "./certificate/TableToolbar";
import FreezeCertificateModal from "./certificate/modals/FreezeCertificateModal";
import RevokeCertificateModal from "./certificate/modals/RevokeCertificateModal";
import TransferCertificateModal from "./certificate/modals/TransferCertificateModal";
import CertificateHistoryModal from "./certificate/modals/CertificateHistoryModal";

interface CertificateTableProps {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 25, 50, 100];

/**
 * Slim composition shell that delegates the bulk of the table's logic to
 * `useCertificateTable` and renders extracted UI pieces. Each modal lives in
 * its own file so it can be tested and reasoned about independently.
 */
const CertificateTable = ({
  onError,
  onSuccess,
}: CertificateTableProps) => {
  const {
    certificates,
    total,
    totalPages,
    loading,
    page,
    limit,
    setPage,
    setLimit,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    hasActiveFilters,
    clearFilters,
    sortBy,
    sortOrder,
    handleSort,
    selectedIds,
    selectAll,
    handleSelect,
    handleSelectAll,
    handleBulkExport,
    handleBulkExportAll,
    handleFreeze,
    handleUnfreeze,
    handleRevoke,
    handleTransfer,
    handleViewHistory,
  } = useCertificateTable({ onError, onSuccess });

  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezingCertId, setFreezingCertId] = useState<string | null>(null);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingCertIds, setRevokingCertIds] = useState<string[]>([]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringCertId, setTransferringCertId] = useState<string | null>(
    null,
  );

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openFreezeModal = useCallback((cert: Certificate) => {
    setFreezingCertId(cert.id);
    setShowFreezeModal(true);
  }, []);

  const closeFreezeModal = useCallback(() => {
    setShowFreezeModal(false);
    setFreezingCertId(null);
  }, []);

  const openRevokeModalForOne = useCallback((cert: Certificate) => {
    setRevokingCertIds([cert.id]);
    setShowRevokeModal(true);
  }, []);

  const openRevokeModalForSelection = useCallback(() => {
    setRevokingCertIds(Array.from(selectedIds));
    setShowRevokeModal(true);
  }, [selectedIds]);

  const closeRevokeModal = useCallback(() => {
    setShowRevokeModal(false);
    setRevokingCertIds([]);
  }, []);

  const openTransferModal = useCallback((cert: Certificate) => {
    setTransferringCertId(cert.id);
    setShowTransferModal(true);
  }, []);

  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferringCertId(null);
  }, []);

  const openHistoryModal = useCallback(
    async (cert: Certificate) => {
      setShowHistoryModal(true);
      setLoadingHistory(true);
      try {
        const events = await handleViewHistory(cert.id);
        setHistory(events);
      } finally {
        setLoadingHistory(false);
      }
    },
    [handleViewHistory],
  );

  const closeHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
  }, []);

  return (
    <div className="space-y-4">
      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(next) => {
          setStatusFilter(next);
          setPage(1);
        }}
        startDate={startDate}
        onStartDateChange={(next) => {
          setStartDate(next);
          setPage(1);
        }}
        endDate={endDate}
        onEndDateChange={(next) => {
          setEndDate(next);
          setPage(1);
        }}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        selectedCount={selectedIds.size}
        filteredCount={total}
        isExportingAll={false}
        onExportSelected={handleBulkExport}
        onExportAll={handleBulkExportAll}
        onRevokeSelected={openRevokeModalForSelection}
      />

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md dark:shadow-lg dark:border dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all visible certificates"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableHeader
                  field="serialNumber"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Certificate ID
                </SortableHeader>
                <SortableHeader
                  field="recipientName"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Recipient
                </SortableHeader>
                <SortableHeader
                  field="title"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Title
                </SortableHeader>
                <SortableHeader
                  field="issuerName"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Issuer
                </SortableHeader>
                <SortableHeader
                  field="issueDate"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Issue Date
                </SortableHeader>
                <SortableHeader
                  field="status"
                  activeField={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
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
                    onToggleSelect={handleSelect}
                    onFreeze={openFreezeModal}
                    onUnfreeze={(c) => {
                      void handleUnfreeze(c.id);
                    }}
                    onRevoke={openRevokeModalForOne}
                    onTransfer={openTransferModal}
                    onViewHistory={openHistoryModal}
                    onViewCertificate={() => {
                      /* No-op: certificate preview lives on its own route. */
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} results
            </span>
            <select
              aria-label="Results per page"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value) as PageSize);
                setPage(1);
              }}
              className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-700"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <FreezeCertificateModal
        isOpen={showFreezeModal}
        onClose={closeFreezeModal}
        onConfirm={async ({ reason, durationDays }) => {
          if (!freezingCertId) return;
          const ok = await handleFreeze({
            certificateId: freezingCertId,
            reason,
            durationDays,
          });
          if (ok) closeFreezeModal();
        }}
      />

      <RevokeCertificateModal
        isOpen={showRevokeModal}
        certificateIds={revokingCertIds}
        onClose={closeRevokeModal}
        onConfirm={async (reason) => {
          const ids = revokingCertIds;
          const ok = await handleRevoke(ids, reason);
          if (ok) closeRevokeModal();
        }}
      />

      <TransferCertificateModal
        isOpen={showTransferModal}
        certificateId={transferringCertId}
        onClose={closeTransferModal}
        onConfirm={async (input) => {
          const ok = await handleTransfer(input);
          if (ok) closeTransferModal();
        }}
      />

      <CertificateHistoryModal
        isOpen={showHistoryModal}
        loading={loadingHistory}
        history={history}
        onClose={closeHistoryModal}
      />
    </div>
  );
};

export default CertificateTable;
