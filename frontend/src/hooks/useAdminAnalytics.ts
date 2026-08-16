import { useCallback, useEffect, useState } from 'react';
import { adminAnalyticsApi, auditApi } from '../api';
import type { AdminAnalytics, AuditLogItem, AuditStatistics } from '../api';

export type DateRange = { startDate: string; endDate: string };

export interface AdminAnalyticsState {
  analytics: AdminAnalytics | null;
  auditStats: AuditStatistics | null;
  recentAudit: AuditLogItem[];
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  load: (range: DateRange) => Promise<void>;
}

/**
 * Encapsulates the admin analytics data fetching so the dashboard component
 * only renders the three states (data / loading / error) instead of owning
 * the fetch lifecycle itself.
 */
export function useAdminAnalytics(initialRange: DateRange): AdminAnalyticsState {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStatistics | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, auditStatistics, auditLogs] = await Promise.all([
        adminAnalyticsApi.getAnalytics(range),
        auditApi.getStatistics(range),
        auditApi.searchLogs({ ...range, limit: 20 }),
      ]);
      setAnalytics(analyticsData);
      setAuditStats(auditStatistics);
      setRecentAudit(auditLogs.data ?? []);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to load admin analytics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { analytics, auditStats, recentAudit, loading, error, setError, load };
}
