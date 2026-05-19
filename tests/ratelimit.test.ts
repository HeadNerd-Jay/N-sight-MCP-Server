import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../src/core/ratelimit.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests immediately if tokens are available", async () => {
    const limiter = new RateLimiter(5);
    const start = Date.now();
    
    // Acquire 3 tokens (max 5)
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    
    expect(Date.now() - start).toBe(0);
  });

  it("should queue requests and execute them as tokens refill", async () => {
    const limiter = new RateLimiter(2);
    
    // Consume both tokens
    await limiter.acquire();
    await limiter.acquire();
    
    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });
    
    expect(resolved).toBe(false);
    
    // Fast-forward time by 30 seconds (30000ms), which refills tokens
    await vi.advanceTimersByTimeAsync(30000);
    
    expect(resolved).toBe(true);
  });
});
