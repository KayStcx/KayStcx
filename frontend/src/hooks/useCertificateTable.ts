import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityItem,
  Certificate,
  CertificateExportFilters,
  certificateApi,
} from "../api";
import { getErrorMessage } from "../utils/getErrorMessage";
import { useDebounce } from "./useDebounce";

export type CertificateSortField =
  | "recipientName"
  | "title"
  | "issuerName"
  | "issueDate"
  | "status"
  | "serialNumber";

export type SortOrder = "asc" | "desc";

export type PageSize = 10 | 25 | 50 | 100;

export type FreezeCertInput = {
  certificateId: string;
  reason: string;
  durationDays: number;
};

export type TransferCertInput = {
  certificateId: string;
  newOwnerEmail: string;
  newOwnerName: string;
  reason?: string;
};

export type NotificationHandler = {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

export type UseCertificateTableResult = {
  // data
  certificates: Certificate[];
  total: number;
  totalPages: number;
  filteredCount: number;
  loading: boolean;

  // pagination
  page: number;
  limit: PageSize;
  setPage: (next: number | ((prev: number) => number)) => void;
  setLimit: (next: PageSize) => void;

  // filters
  search: string;
  setSearch: (next: string) => void;
  statusFilter: string;
  setStatusFilter: (next: string) => void;
  startDate: string;
  setStartDate: (next: string) => void;
  endDate: string;
  setEndDate: (next: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // sorting
  sortBy: CertificateSortField;
  sortOrder: SortOrder;
  handleSort: (field: CertificateSortField) => void;

  // selection
  selectedIds: Set<string>;
  selectAll: boolean;
  handleSelect: (id: string) => void;
  handleSelectAll: () => void;
  clearSelection: () => void;

  // actions
  fetchCertificates: () => Promise<void>;
  handleBulkExport: () => Promise<void>;
  handleBulkExportAll: () => Promise<void>;
  handleFreeze: (input: FreezeCertInput) => Promise<boolean>;
  handleUnfreeze: (certificateId: string) => Promise<boolean>;
  handleRevoke: (
    certificateIds: string[],
    reason?: string,
  ) => Promise<boolean>;
  handleTransfer: (input: TransferCertInput) => Promise<boolean>;
  handleViewHistory: (certId: string) => Promise<ActivityItem[]>;
};

/**
 * Encapsulates all of the state, data fetching, filter piping and bulk
 * actions for the certificate management table. Splitting this out of the
 * table component keeps the view file lean and makes each concern
 * individually testable.
 */
export function useCertificateTable(
  notifications: NotificationHandler = {},
): UseCertificateTableResult {
  // Capture notify callbacks behind a ref so the rest of the hook can stay
  // referentially stable. Without this, callers that pass fresh function
  // props every render would trigger an infinite fetch loop.
  const notifierRef = useRef(notifications);
  notifierRef.current = notifications;

  // Data + pagination
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);

  // Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState<CertificateSortField>("issueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await certificateApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setCertificates(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      notifierRef.current.onError?.(
        getErrorMessage(err, "Failed to fetch certificates"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    statusFilter,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    void fetchCertificates();
  }, [fetchCertificates]);

  const handleSort = useCallback(
    (field: CertificateSortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (certificates.length === 0) return prev;
      if (prev.size === certificates.length) {
        return new Set();
      }
      return new Set(certificates.map((c) => c.id));
    });
  }, [certificates]);

  useEffect(() => {
    setSelectAll(
      certificates.length > 0 && selectedIds.size === certificates.length,
    );
  }, [certificates, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  const resetToFirstPage = useCallback(() => setPage(1), []);

  const hasActiveFilters = Boolean(
    search || statusFilter || startDate || endDate,
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  // Search/status/date filters reset pagination to the first page.
  useEffect(() => {
    resetToFirstPage();
  }, [search, statusFilter, startDate, endDate, resetToFirstPage]);

  const buildExportFilters = useCallback(
    (): CertificateExportFilters => ({
      search: search || undefined,
      status: statusFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [search, statusFilter, startDate, endDate],
  );

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleBulkExport = useCallback(async () => {
    try {
      const blob = await certificateApi.bulkExport(
        Array.from(selectedIds),
        buildExportFilters(),
      );
      downloadBlob(
        blob,
        `certificates-export-${new Date().toISOString().split("T")[0]}.csv`,
      );
      notifierRef.current.onSuccess?.("Certificates exported successfully");
    } catch (err) {
      notifierRef.current.onError?.(
        getErrorMessage(err, "Failed to export certificates"),
      );
    }
  }, [selectedIds, buildExportFilters, downloadBlob]);

  const handleBulkExportAll = useCallback(async () => {
    try {
      const blob = await certificateApi.bulkExportAll(buildExportFilters());
      downloadBlob(
        blob,
        `certificates-export-all-${new Date().toISOString().split("T")[0]}.csv`,
      );
      notifierRef.current.onSuccess?.(
        `Successfully exported ${total} certificates`,
      );
    } catch (err) {
      notifierRef.current.onError?.(
        getErrorMessage(err, "Failed to export certificates"),
      );
    }
  }, [buildExportFilters, downloadBlob, total]);

  const handleFreeze = useCallback(
    async ({
      certificateId,
      reason,
      durationDays,
    }: FreezeCertInput): Promise<boolean> => {
      try {
        const safeDuration = Math.max(
          1,
          Number.isFinite(durationDays) ? Math.trunc(durationDays) : 1,
        );
        await certificateApi.freeze(certificateId, reason, safeDuration);
        notifierRef.current.onSuccess?.("Certificate frozen successfully");
        await fetchCertificates();
        return true;
      } catch (err) {
        notifierRef.current.onError?.(
          getErrorMessage(err, "Failed to freeze certificate"),
        );
        return false;
      }
    },
    [fetchCertificates],
  );

  const handleUnfreeze = useCallback(
    async (certificateId: string): Promise<boolean> => {
      try {
        await certificateApi.unfreeze(certificateId);
        notifierRef.current.onSuccess?.("Certificate unfrozen successfully");
        await fetchCertificates();
        return true;
      } catch (err) {
        notifierRef.current.onError?.(
          getErrorMessage(err, "Failed to unfreeze certificate"),
        );
        return false;
      }
    },
    [fetchCertificates],
  );

  const handleRevoke = useCallback(
    async (
      certificateIds: string[],
      reason?: string,
    ): Promise<boolean> => {
      try {
        await certificateApi.bulkRevoke(certificateIds, reason);
        notifierRef.current.onSuccess?.(
          "Certificates revoked successfully",
        );
        clearSelection();
        await fetchCertificates();
        return true;
      } catch (err) {
        notifierRef.current.onError?.(
          getErrorMessage(err, "Failed to revoke certificates"),
        );
        return false;
      }
    },
    [clearSelection, fetchCertificates],
  );

  const handleTransfer = useCallback(
    async (input: TransferCertInput): Promise<boolean> => {
      try {
        await certificateApi.transfer.initiate(input);
        notifierRef.current.onSuccess?.(
          "Transfer initiated successfully. New owner must approve.",
        );
        await fetchCertificates();
        return true;
      } catch (err) {
        notifierRef.current.onError?.(
          getErrorMessage(err, "Failed to initiate transfer"),
        );
        return false;
      }
    },
    [fetchCertificates],
  );

  const handleViewHistory = useCallback(
    async (certId: string): Promise<ActivityItem[]> => {
      try {
        const { auditApi } = await import("../api");
        return await auditApi.getCertificateHistory(certId);
      } catch (err) {
        notifierRef.current.onError?.(
          getErrorMessage(err, "Failed to load certificate history"),
        );
        return [];
      }
    },
    [],
  );

  const filteredCount = total;

  return useMemo(
    () => ({
      certificates,
      total,
      totalPages,
      filteredCount,
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
      clearSelection,
      fetchCertificates,
      handleBulkExport,
      handleBulkExportAll,
      handleFreeze,
      handleUnfreeze,
      handleRevoke,
      handleTransfer,
      handleViewHistory,
    }),
    [
      certificates,
      total,
      totalPages,
      filteredCount,
      loading,
      page,
      limit,
      search,
      statusFilter,
      startDate,
      endDate,
      hasActiveFilters,
      clearFilters,
      sortBy,
      sortOrder,
      handleSort,
      selectedIds,
      selectAll,
      handleSelect,
      handleSelectAll,
      clearSelection,
      fetchCertificates,
      handleBulkExport,
      handleBulkExportAll,
      handleFreeze,
      handleUnfreeze,
      handleRevoke,
      handleTransfer,
      handleViewHistory,
    ],
  );
}
