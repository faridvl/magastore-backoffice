const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function recordFailedAttempt(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    return { blocked: true, remaining: 0 };
  }

  return { blocked: entry.count >= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - entry.count) };
}

export function isBlocked(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now >= entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function clearAttempts(ip: string): void {
  store.delete(ip);
}
