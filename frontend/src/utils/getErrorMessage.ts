/**
 * Extract a human-readable message from an unknown thrown value, falling back
 * to a sensible default. Keeps error handling consistent across data hooks.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
