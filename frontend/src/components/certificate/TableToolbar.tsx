import { Download, X, XCircle, Search } from "lucide-react";
import type { ChangeEvent } from "react";


interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  selectedCount: number;
  filteredCount: number;
  isExportingAll: boolean;
  onExportSelected: () => void;
  onExportAll: () => void;
  onRevokeSelected: () => void;
}

/**
 * Search input, status & date filters, and the bulk-action buttons that sit
 * above the certificate table. Owns no data state of its own — it's a
 * controlled view component.
 */
const TableToolbar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters,
  selectedCount,
  filteredCount,
  isExportingAll,
  onExportSelected,
  onExportAll,
  onRevokeSelected,
}: TableToolbarProps) => {
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) =>
    onSearchChange(e.target.value);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-md dark:shadow-lg dark:border dark:border-slate-700">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by recipient, ID, or issuer..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          />
        </div>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
          <option value="frozen">Frozen</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          />
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onExportSelected}
          disabled={selectedCount === 0}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export ({selectedCount})
        </button>

        <button
          type="button"
          onClick={onExportAll}
          disabled={isExportingAll || filteredCount === 0}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExportingAll
            ? "Exporting..."
            : `Export All (${filteredCount})`}
        </button>

        <button
          type="button"
          onClick={onRevokeSelected}
          disabled={selectedCount === 0}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Revoke ({selectedCount})
        </button>
      </div>
    </div>
  );
};

export default TableToolbar;
