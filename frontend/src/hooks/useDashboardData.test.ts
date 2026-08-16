import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDashboardSummaryMock: vi.fn(),
}));

vi.mock("../api", () => ({
  analyticsApi: {
    getDashboardSummary: (...args: unknown[]) =>
      mocks.getDashboardSummaryMock(...args),
  },
}));

import { useDashboardData } from "./useDashboardData";

const range = { startDate: "2026-01-01", endDate: "2026-01-07" };

describe("useDashboardData", () => {
  beforeEach(() => {
    mocks.getDashboardSummaryMock.mockReset();
  });

  it("loads the dashboard summary and exposes the data", async () => {
    mocks.getDashboardSummaryMock.mockResolvedValue({
      totalCertificates: 3,
      activeCertificates: 2,
      recentActivity: [],
    });

    const { result } = renderHook(() => useDashboardData(range));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.getDashboardSummaryMock).toHaveBeenCalledWith({
      startDate: "2026-01-01",
      endDate: "2026-01-07",
    });
    expect(result.current.data).toEqual({
      totalCertificates: 3,
      activeCertificates: 2,
      recentActivity: [],
    });
    expect(result.current.error).toBeNull();
  });

  it("surfaces a readable error message when loading fails", async () => {
    mocks.getDashboardSummaryMock.mockRejectedValue(new Error("analytics down"));

    const { result } = renderHook(() => useDashboardData(range));

    await waitFor(() => expect(result.current.error).toBe("analytics down"));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("refetches on demand with an explicit date range", async () => {
    mocks.getDashboardSummaryMock.mockResolvedValue({
      totalCertificates: 1,
      recentActivity: [],
    });

    const { result } = renderHook(() => useDashboardData(range));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const nextRange = { startDate: "2026-02-01", endDate: "2026-02-07" };
    await act(async () => {
      await result.current.refetch(nextRange);
    });

    expect(mocks.getDashboardSummaryMock).toHaveBeenLastCalledWith({
      startDate: "2026-02-01",
      endDate: "2026-02-07",
    });
  });
});
