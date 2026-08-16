import { useCallback, useEffect, useState } from "react";
import { getUserCertificates } from "../api";
import type { Certificate } from "../api";
import { getErrorMessage } from "../utils/getErrorMessage";

export type UseRecipientCertificatesResult = {
  certificates: Certificate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<Certificate[] | null>;
};

/**
 * Fetch the current user's certificate wallet. Returns an empty list when no
 * user is available and exposes `refetch` to reload on demand.
 */
export function useRecipientCertificates(
  userId: string | undefined,
): UseRecipientCertificatesResult {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<Certificate[] | null> => {
    if (!userId) {
      setCertificates([]);
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getUserCertificates(userId);
      setCertificates(result);
      return result;
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your certificate wallet"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { certificates, loading, error, refetch };
}
