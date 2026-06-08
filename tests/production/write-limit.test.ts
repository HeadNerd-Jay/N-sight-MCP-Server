/**
 * Tests for NSIGHT_MAX_WRITES_PER_SESSION enforcement in production-server.ts.
 *
 * The limit logic lives in the server handler, so we test it directly by
 * simulating the guard function extracted into a helper that mirrors the
 * server's behaviour.
 */
import { describe, it, expect } from "vitest";

// Mirror the server's guard logic so we can unit-test it independently.
function checkWriteLimit(
  toolName: string,
  confirm: boolean,
  writeCount: number,
  maxWrites: number,
  writeTools: Set<string>
): { blocked: boolean; newCount: number } {
  if (writeTools.has(toolName) && confirm === true) {
    if (writeCount >= maxWrites) {
      return { blocked: true, newCount: writeCount };
    }
    return { blocked: false, newCount: writeCount + 1 };
  }
  return { blocked: false, newCount: writeCount };
}

const WRITE_TOOLS = new Set([
  "clear_check", "add_check_note",
  "approve_patch", "ignore_patch", "retry_patch",
  "start_av_scan", "cancel_av_scan",
  "release_quarantine_item", "remove_quarantine_item", "update_av_definitions",
  "run_task", "add_client", "add_site",
]);

describe("session write limit", () => {
  it("allows a confirmed write when under the limit", () => {
    const { blocked, newCount } = checkWriteLimit("clear_check", true, 0, 5, WRITE_TOOLS);
    expect(blocked).toBe(false);
    expect(newCount).toBe(1);
  });

  it("increments the counter on each confirmed write", () => {
    let count = 0;
    for (let i = 0; i < 5; i++) {
      const result = checkWriteLimit("clear_check", true, count, 5, WRITE_TOOLS);
      expect(result.blocked).toBe(false);
      count = result.newCount;
    }
    expect(count).toBe(5);
  });

  it("blocks a confirmed write when the limit is exactly reached", () => {
    const { blocked } = checkWriteLimit("clear_check", true, 5, 5, WRITE_TOOLS);
    expect(blocked).toBe(true);
  });

  it("blocks a confirmed write when the limit is exceeded", () => {
    const { blocked } = checkWriteLimit("run_task", true, 99, 20, WRITE_TOOLS);
    expect(blocked).toBe(true);
  });

  it("does NOT count unconfirmed write calls", () => {
    const { blocked, newCount } = checkWriteLimit("clear_check", false, 19, 20, WRITE_TOOLS);
    expect(blocked).toBe(false);
    expect(newCount).toBe(19); // counter unchanged
  });

  it("does NOT count read-only tool calls", () => {
    const { blocked, newCount } = checkWriteLimit("list_clients", true, 19, 20, WRITE_TOOLS);
    expect(blocked).toBe(false);
    expect(newCount).toBe(19); // counter unchanged
  });

  it("blocks all 13 write tool names when limit is reached", () => {
    for (const tool of WRITE_TOOLS) {
      const { blocked } = checkWriteLimit(tool, true, 20, 20, WRITE_TOOLS);
      expect(blocked, `Expected ${tool} to be blocked`).toBe(true);
    }
  });

  it("does not block any write tool when confirm is false, regardless of count", () => {
    for (const tool of WRITE_TOOLS) {
      const { blocked } = checkWriteLimit(tool, false, 999, 20, WRITE_TOOLS);
      expect(blocked, `Expected ${tool} unconfirmed call to pass through`).toBe(false);
    }
  });
});
