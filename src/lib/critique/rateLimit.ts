export type LimitResult = { allowed: boolean; remaining: number; resetAt: number };

/**
 * Fixed-window counter kept in memory. On serverless hosting each instance has
 * its own memory, so this is a cost guard for a demo, not an exact quota; a
 * shared store such as Redis is the next step for real traffic.
 */
export class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): LimitResult {
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, entry);
      this.prune(now);
    }
    if (entry.count >= this.limit) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    entry.count++;
    return { allowed: true, remaining: this.limit - entry.count, resetAt: entry.resetAt };
  }

  private prune(now: number) {
    if (this.windows.size < 1000) return;
    for (const [key, entry] of this.windows) if (now >= entry.resetAt) this.windows.delete(key);
  }
}
