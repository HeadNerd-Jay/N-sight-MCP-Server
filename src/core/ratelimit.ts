/**
 * Token-bucket rate limiter — N-sight enforces max 60 calls/minute.
 */

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillIntervalMs: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(callsPerMinute: number = 60) {
    this.maxTokens = callsPerMinute;
    this.tokens = callsPerMinute;
    this.refillIntervalMs = (60 * 1000) / callsPerMinute;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) { this.tokens--; return; }
    return new Promise((resolve) => {
      this.queue.push(resolve);
      setTimeout(() => this.drainQueue(), this.refillIntervalMs);
    });
  }

  private refill(): void {
    const now = Date.now();
    const newTokens = Math.floor((now - this.lastRefill) / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  private drainQueue(): void {
    this.refill();
    while (this.queue.length > 0 && this.tokens > 0) {
      this.tokens--;
      this.queue.shift()?.();
    }
  }
}
