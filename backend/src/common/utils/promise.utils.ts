/**
 * Await a promise, returning a fallback value if it rejects.
 *
 * Used to isolate independent parallel data fetches (e.g. dashboard
 * statistics) so that a single transient failure in one source does not
 * cascade and break the entire aggregate response.
 */
export async function settlePromise<T>(
  promise: Promise<T>,
  fallback: T,
  onError?: (error: unknown) => void,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}
