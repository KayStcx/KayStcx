const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Convert a JWT-style duration string (e.g. "15m", "1h", "7d") into
 * milliseconds. Used to keep token expiry configurable via environment
 * variables while still being able to compute absolute expiry timestamps.
 */
export function durationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d|w|y)?$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  const amount = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  return amount * UNIT_TO_MS[unit];
}

export function durationToSeconds(value: string): number {
  return Math.floor(durationToMs(value) / 1000);
}
