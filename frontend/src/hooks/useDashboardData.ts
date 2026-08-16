import { useCallback, useEffect, useState } from "react";
import { analyticsApi } from "../api";
import type { DashboardStats } from "../api";
import { getErrorMessage } from "../utils/getErrorMessage";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type UseDashboardDataResult = {
  data: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: (range?: DateRange) => Promise<DashboardStats | null>;
};

/**
 * Fetch the issuer analytics summary. Re-fetches automatically whenever the
 * date range changes and exposes `refetch` for explicit refreshes (Apply /
 * Reset). Keeps data fetching decoupled from rendering.
 */
export function useDashboardData(dateRange: DateRange): UseDashboardDataResult {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (range?: DateRange): Promise<DashboardStats | null> => {
      const target = range ?? dateRange;
      setLoading(true);
      setError(null);
      try {
        const result = await analyticsApi.getDashboardSummary({
          startDate: target.startDate,
          endDate: target.endDate,
        });
        setData(result);
        return result;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load analytics"));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
