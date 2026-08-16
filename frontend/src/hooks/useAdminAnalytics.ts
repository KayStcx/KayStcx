import { useCallback, useEffect, useRef, useState } from "react";
import { adminAnalyticsApi, auditApi } from "../api";
import type { AdminAnalytics, AuditLogItem, AuditStatistics } from "../api";
import { getErrorMessage } from "../utils/getErrorMessage";
import type { DateRange } from "./useDashboardData";

export type AdminAnalyticsData = {
  analytics: AdminAnalytics | null;
  auditStats: AuditStatistics | null;
  recentAudit: AuditLogItem[];
};

export type UseAdminAnalyticsResult = {
  data: AdminAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refetch: (range: DateRange) => Promise<AdminAnalyticsData | null>;
};

/**
 * Fetch admin analytics, audit statistics and recent audit events in parallel
 * on mount, and expose `refetch` for explicit refreshes (Apply / Reset).
 */
export function useAdminAnalytics(dateRange: DateRange): UseAdminAnalyticsResult {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capture the initial range so the mount fetch uses it without re-running.
  const initialRangeRef = useRef(dateRange);

  const refetch = useCallback(
    async (range: DateRange): Promise<AdminAnalyticsData | null> => {
      setLoading(true);
      setError(null);
      try {
        const [analytics, auditStats, auditLogs] = await Promise.all([
          adminAnalyticsApi.getAnalytics(range),
          auditApi.getStatistics(range),
          auditApi.searchLogs({ ...range, limit: 20 }),
        ]);
        const result: AdminAnalyticsData = {
          analytics,
          auditStats,
          recentAudit: auditLogs.data ?? [],
        };
        setData(result);
        return result;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load admin analytics"));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refetch(initialRangeRef.current);
  }, [refetch]);

  return { data, loading, error, refetch };
}
