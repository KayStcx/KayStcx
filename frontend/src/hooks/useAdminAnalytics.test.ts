import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAnalyticsMock: vi.fn(),
  getStatisticsMock: vi.fn(),
  searchLogsMock: vi.fn(),
}));

vi.mock("../api", () => ({
  adminAnalyticsApi: {
    getAnalytics: (...args: unknown[]) => mocks.getAnalyticsMock(...args),
  },
  auditApi: {
    getStatistics: (...args: unknown[]) => mocks.getStatisticsMock(...args),
    searchLogs: (...args: unknown[]) => mocks.searchLogsMock(...args),
  },
}));

import { useAdminAnalytics } from "./useAdminAnalytics";

const range = { startDate: "2026-01-01", endDate: "2026-01-07" };

describe("useAdminAnalytics", () => {
  beforeEach(() => {
    mocks.getAnalyticsMock.mockReset();
    mocks.getStatisticsMock.mockReset();
    mocks.searchLogsMock.mockReset();
  });

  it("loads analytics, statistics and recent audit events in parallel", async () => {
    mocks.getAnalyticsMock.mockResolvedValue({ totalIssuers: 2 });
    mocks.getStatisticsMock.mockResolvedValue({ total: 5 });
    mocks.searchLogsMock.mockResolvedValue({ data: [{ id: "audit-1" }], total: 1 });

    const { result } = renderHook(() => useAdminAnalytics(range));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.getAnalyticsMock).toHaveBeenCalledWith(range);
    expect(mocks.getStatisticsMock).toHaveBeenCalledWith(range);
    expect(mocks.searchLogsMock).toHaveBeenCalledWith({ ...range, limit: 20 });

    expect(result.current.data).toEqual({
      analytics: { totalIssuers: 2 },
      auditStats: { total: 5 },
      recentAudit: [{ id: "audit-1" }],
    });
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error when any of the parallel calls fail", async () => {
    mocks.getAnalyticsMock.mockResolvedValue({ totalIssuers: 2 });
    mocks.getStatisticsMock.mockRejectedValue(new Error("stats failed"));
    mocks.searchLogsMock.mockResolvedValue({ data: [], total: 0 });

    const { result } = renderHook(() => useAdminAnalytics(range));

    await waitFor(() => expect(result.current.error).toBe("stats failed"));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("refetches on demand with a new date range", async () => {
    mocks.getAnalyticsMock.mockResolvedValue({ totalIssuers: 1 });
    mocks.getStatisticsMock.mockResolvedValue({ total: 1 });
    mocks.searchLogsMock.mockResolvedValue({ data: [], total: 0 });

    const { result } = renderHook(() => useAdminAnalytics(range));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const nextRange = { startDate: "2026-02-01", endDate: "2026-02-07" };
    await act(async () => {
      await result.current.refetch(nextRange);
    });

    expect(mocks.getAnalyticsMock).toHaveBeenLastCalledWith(nextRange);
    expect(mocks.getStatisticsMock).toHaveBeenLastCalledWith(nextRange);
    expect(mocks.searchLogsMock).toHaveBeenLastCalledWith({ ...nextRange, limit: 20 });
  });
});
