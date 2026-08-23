import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageSize } from "../../hooks/useCertificateTable";

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 25, 50, 100];

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: PageSize;
  onPageChange: (next: number | ((prev: number) => number)) => void;
  onLimitChange: (next: PageSize) => void;
}

/**
 * Pagination footer for the certificate table: result range, rows-per-page
 * selector and prev/next controls.
 */
const TablePagination = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: TablePaginationProps) => (
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
          onLimitChange(Number(e.target.value) as PageSize);
          onPageChange(1);
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
        onClick={() => onPageChange((p) => Math.max(1, p - 1))}
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
        onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-700"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);

export default TablePagination;
