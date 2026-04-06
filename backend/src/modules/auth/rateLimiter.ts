export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  count: number;
  resetsAt: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  public consume(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetsAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetsAt: now + windowMs,
      });
      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    }

    if (current.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
      };
    }

    current.count += 1;
    this.buckets.set(key, current);
    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }
}
