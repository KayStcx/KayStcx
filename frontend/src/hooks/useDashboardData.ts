import { useCallback, useEffect, useState } from 'react';
import { analyticsApi } from '../api';
import type { DashboardStats } from '../api';

export type DateRange = { startDate: string; endDate: string };

export interface DashboardDataState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  load: (range: DateRange) => Promise<void>;
}

/**
 * Encapsulates issuer dashboard analytics fetching. The hook returns
 * `{ stats, loading, error, load }` so the presentation component can render
 * the three states without coupling itself to the fetch lifecycle.
 */
export function useDashboardData(initialRange: DateRange): DashboardDataState {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboardSummary({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      setStats(data);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to load analytics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, loading, error, load };
}
