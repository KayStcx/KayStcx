import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Certificate } from "../api";

const mocks = vi.hoisted(() => ({
  listMock: vi.fn(),
  bulkExportMock: vi.fn(),
  bulkExportAllMock: vi.fn(),
  bulkRevokeMock: vi.fn(),
  freezeMock: vi.fn(),
  unfreezeMock: vi.fn(),
  transferInitiateMock: vi.fn(),
  getCertificateHistoryMock: vi.fn(),
}));

vi.mock("../api", () => ({
  certificateApi: {
    list: (...args: unknown[]) => mocks.listMock(...args),
    bulkExport: (...args: unknown[]) => mocks.bulkExportMock(...args),
    bulkExportAll: (...args: unknown[]) => mocks.bulkExportAllMock(...args),
    bulkRevoke: (...args: unknown[]) => mocks.bulkRevokeMock(...args),
    freeze: (...args: unknown[]) => mocks.freezeMock(...args),
    unfreeze: (...args: unknown[]) => mocks.unfreezeMock(...args),
    transfer: {
      initiate: (...args: unknown[]) => mocks.transferInitiateMock(...args),
    },
  },
  auditApi: {
    getCertificateHistory: (...args: unknown[]) =>
      mocks.getCertificateHistoryMock(...args),
  },
}));

import { useCertificateTable } from "./useCertificateTable";

const makeCert = (overrides: Partial<Certificate> = {}): Certificate => ({
  id: overrides.id ?? "cert-1",
  serialNumber: overrides.serialNumber ?? "CERT-2026-001",
  recipientName: overrides.recipientName ?? "Alice Johnson",
  recipientEmail: overrides.recipientEmail ?? "alice@example.com",
  title: overrides.title ?? "Blockchain Fundamentals",
  courseName: overrides.courseName ?? "Blockchain 101",
  issuerName: overrides.issuerName ?? "Kaystcx Academy",
  issueDate: overrides.issueDate ?? "2026-01-01T00:00:00.000Z",
  status: overrides.status ?? "active",
  ...overrides,
});

const sampleResponse = {
  data: [makeCert(), makeCert({ id: "cert-2", serialNumber: "CERT-2026-002" })],
  total: 2,
  totalPages: 1,
};

describe("useCertificateTable", () => {
  beforeEach(() => {
    mocks.listMock.mockReset();
    mocks.bulkExportMock.mockReset();
    mocks.bulkExportAllMock.mockReset();
    mocks.bulkRevokeMock.mockReset();
    mocks.freezeMock.mockReset();
    mocks.unfreezeMock.mockReset();
    mocks.transferInitiateMock.mockReset();
    mocks.getCertificateHistoryMock.mockReset();

    mocks.listMock.mockResolvedValue(sampleResponse);
  });

  it("fetches certificates on mount and exposes them", async () => {
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.listMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
    expect(result.current.certificates).toHaveLength(2);
    expect(result.current.total).toBe(2);
  });

  it("debounces the search input before issuing a request", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() =>
        useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      mocks.listMock.mockClear();

      act(() => {
        result.current.setSearch("alice");
      });

      // No request should fire before the debounce interval elapses.
      await act(async () => {
        vi.advanceTimersByTime(299);
      });
      expect(mocks.listMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() =>
        expect(mocks.listMock).toHaveBeenCalledWith(
          expect.objectContaining({ search: "alice" }),
        ),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("toggles sort field and order", async () => {
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleSort("title"));
    expect(result.current.sortBy).toBe("title");
    expect(result.current.sortOrder).toBe("asc");

    act(() => result.current.handleSort("title"));
    expect(result.current.sortOrder).toBe("desc");
  });

  it("manages bulk selection and select-all state", async () => {
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleSelect("cert-1"));
    act(() => result.current.handleSelect("cert-2"));
    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectAll).toBe(true);

    act(() => result.current.handleSelectAll());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("calls the freeze API with the supplied reason/duration and notifies on success", async () => {
    mocks.freezeMock.mockResolvedValue(makeCert({ status: "frozen" }));

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.handleFreeze({
        certificateId: "cert-1",
        reason: "Audit in progress",
        durationDays: 14,
      });
    });

    expect(ok).toBe(true);
    expect(mocks.freezeMock).toHaveBeenCalledWith("cert-1", "Audit in progress", 14);
    expect(onSuccess).toHaveBeenCalledWith("Certificate frozen successfully");
  });

  it("clamps the freeze duration to a minimum of 1 and surfaces API failures", async () => {
    mocks.freezeMock.mockRejectedValueOnce(new Error("boom"));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useCertificateTable({
        onError,
        onSuccess: vi.fn(),
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.handleFreeze({
        certificateId: "cert-1",
        reason: "Bad input",
        durationDays: -10,
      });
    });

    expect(ok).toBe(false);
    expect(mocks.freezeMock).toHaveBeenCalledWith("cert-1", "Bad input", 1);
    expect(onError).toHaveBeenCalledWith("boom");
  });

  it("revokes certificates and clears selection afterwards", async () => {
    mocks.bulkRevokeMock.mockResolvedValue([]);

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleSelect("cert-1");
      result.current.handleSelect("cert-2");
    });

    await act(async () => {
      await result.current.handleRevoke(["cert-1", "cert-2"], "policy change");
    });

    expect(mocks.bulkRevokeMock).toHaveBeenCalledWith(
      ["cert-1", "cert-2"],
      "policy change",
    );
    expect(result.current.selectedIds.size).toBe(0);
    expect(onSuccess).toHaveBeenCalledWith("Certificates revoked successfully");
  });

  it("transfers ownership and returns success", async () => {
    mocks.transferInitiateMock.mockResolvedValue({ id: "tx-1" });

    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.handleTransfer({
        certificateId: "cert-1",
        newOwnerEmail: "bob@example.com",
        newOwnerName: "Bob",
        reason: "name correction",
      });
    });

    expect(ok).toBe(true);
    expect(mocks.transferInitiateMock).toHaveBeenCalledWith({
      certificateId: "cert-1",
      newOwnerEmail: "bob@example.com",
      newOwnerName: "Bob",
      reason: "name correction",
    });
  });

  it("fetches history through auditApi and gracefully handles errors", async () => {
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocks.getCertificateHistoryMock.mockResolvedValueOnce([
      { type: "issue", date: "2026-01-01", description: "Issued" },
    ]);

    let history: Awaited<ReturnType<typeof result.current.handleViewHistory>>;
    await act(async () => {
      history = await result.current.handleViewHistory("cert-1");
    });
    expect(history!).toHaveLength(1);

    mocks.getCertificateHistoryMock.mockRejectedValueOnce(new Error("oops"));
    const onError = vi.fn();
    const { result: result2 } = renderHook(() =>
      useCertificateTable({ onError, onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result2.current.loading).toBe(false));

    await act(async () => {
      history = await result2.current.handleViewHistory("cert-1");
    });
    expect(history!).toEqual([]);
    expect(onError).toHaveBeenCalledWith("oops");
  });

  it("clears filters and resets pagination", async () => {
    const { result } = renderHook(() =>
      useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearch("hello");
      result.current.setStatusFilter("active");
      result.current.setPage(3);
    });

    act(() => result.current.clearFilters());

    expect(result.current.search).toBe("");
    expect(result.current.statusFilter).toBe("");
    expect(result.current.page).toBe(1);
  });

  it("calls bulkExportAll when exporting all filtered results", async () => {
    const blob = new Blob(["x"]);
    mocks.bulkExportAllMock.mockResolvedValueOnce(blob);

    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    const createSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tag: string) => {
        const el = originalCreate(tag);
        if (tag === "a") {
          (el as HTMLAnchorElement).click = click;
        }
        return el;
      }) as typeof document.createElement);

    const originalUrl = (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL;
    (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL = createObjectURL;
    const originalRevoke = (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL;
    (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL = revokeObjectURL;

    try {
      const { result } = renderHook(() =>
        useCertificateTable({ onError: vi.fn(), onSuccess: vi.fn() }),
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleBulkExportAll();
      });

      expect(mocks.bulkExportAllMock).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    } finally {
      (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL = originalUrl;
      (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL = originalRevoke;
      createSpy.mockRestore();
    }
  });
});
