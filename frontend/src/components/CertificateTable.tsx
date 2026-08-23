import { useCertificateTable } from "../hooks/useCertificateTable";
import { useCertificateModals } from "../hooks/useCertificateModals";
import CertificateTableBody from "./certificate/CertificateTableBody";
import TablePagination from "./certificate/TablePagination";
import TableToolbar from "./certificate/TableToolbar";
import FreezeCertificateModal from "./certificate/modals/FreezeCertificateModal";
import RevokeCertificateModal from "./certificate/modals/RevokeCertificateModal";
import TransferCertificateModal from "./certificate/modals/TransferCertificateModal";
import CertificateHistoryModal from "./certificate/modals/CertificateHistoryModal";

interface CertificateTableProps {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

/**
 * Slim composition shell for the certificate management table. Data,
 * filtering, sorting, selection and action logic live in
 * `useCertificateTable`; modal visibility lives in `useCertificateModals`;
 * every visual block is an extracted component.
 */
const CertificateTable = ({ onError, onSuccess }: CertificateTableProps) => {
  const table = useCertificateTable({ onError, onSuccess });
  const modals = useCertificateModals({
    onViewHistory: table.handleViewHistory,
  });

  return (
    <div className="space-y-4">
      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        statusFilter={table.statusFilter}
        onStatusFilterChange={(next) => {
          table.setStatusFilter(next);
          table.setPage(1);
        }}
        startDate={table.startDate}
        onStartDateChange={(next) => {
          table.setStartDate(next);
          table.setPage(1);
        }}
        endDate={table.endDate}
        onEndDateChange={(next) => {
          table.setEndDate(next);
          table.setPage(1);
        }}
        onClearFilters={table.clearFilters}
        hasActiveFilters={table.hasActiveFilters}
        selectedCount={table.selectedIds.size}
        filteredCount={table.total}
        isExportingAll={false}
        onExportSelected={table.handleBulkExport}
        onExportAll={table.handleBulkExportAll}
        onRevokeSelected={() =>
          modals.openRevokeModalForSelection(table.selectedIds)
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md dark:shadow-lg dark:border dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <CertificateTableBody
            loading={table.loading}
            certificates={table.certificates}
            selectedIds={table.selectedIds}
            selectAll={table.selectAll}
            onSelectAll={table.handleSelectAll}
            onSelect={table.handleSelect}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.handleSort}
            onFreeze={modals.openFreezeModal}
            onUnfreeze={(cert) => {
              void table.handleUnfreeze(cert.id);
            }}
            onRevoke={modals.openRevokeModalForOne}
            onTransfer={modals.openTransferModal}
            onViewHistory={modals.openHistoryModal}
          />
        </div>

        <TablePagination
          page={table.page}
          totalPages={table.totalPages}
          total={table.total}
          limit={table.limit}
          onPageChange={table.setPage}
          onLimitChange={table.setLimit}
        />
      </div>

      <FreezeCertificateModal
        isOpen={modals.showFreezeModal}
        onClose={modals.closeFreezeModal}
        onConfirm={async ({ reason, durationDays }) => {
          if (!modals.freezingCertId) return;
          const ok = await table.handleFreeze({
            certificateId: modals.freezingCertId,
            reason,
            durationDays,
          });
          if (ok) modals.closeFreezeModal();
        }}
      />

      <RevokeCertificateModal
        isOpen={modals.showRevokeModal}
        certificateIds={modals.revokingCertIds}
        onClose={modals.closeRevokeModal}
        onConfirm={async (reason) => {
          const ids = modals.revokingCertIds;
          const ok = await table.handleRevoke(ids, reason);
          if (ok) modals.closeRevokeModal();
        }}
      />

      <TransferCertificateModal
        isOpen={modals.showTransferModal}
        certificateId={modals.transferringCertId}
        onClose={modals.closeTransferModal}
        onConfirm={async (input) => {
          const ok = await table.handleTransfer(input);
          if (ok) modals.closeTransferModal();
        }}
      />

      <CertificateHistoryModal
        isOpen={modals.showHistoryModal}
        loading={modals.loadingHistory}
        history={modals.history}
        onClose={modals.closeHistoryModal}
      />
    </div>
  );
};

export default CertificateTable;
