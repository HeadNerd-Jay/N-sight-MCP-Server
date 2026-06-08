import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearCheck } from "../../src/tools/production/clear-check.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clear_check", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await clearCheck(mockClient, mockAudit, { check_id: 1, device_id: 2, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("clear_check");
    expect(result.check_id).toBe(1);
    expect(result.device_id).toBe(2);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await clearCheck(mockClient, mockAudit, { check_id: 1, device_id: 2, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });

    await clearCheck(mockClient, mockAudit, { check_id: 1, device_id: 2, confirm: true });

    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls clear_a_check with correct params when confirmed", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await clearCheck(mockClient, mockAudit, { check_id: 42, device_id: 99, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "clear_a_check", checkid: 42, deviceid: 99 });
  });

  it("returns success JSON with check_id, device_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await clearCheck(mockClient, mockAudit, { check_id: 42, device_id: 99, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.action).toBe("clear_check");
    expect(result.check_id).toBe(42);
    expect(result.device_id).toBe(99);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(clearCheck(mockClient, mockAudit, { check_id: 1, device_id: 2, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
