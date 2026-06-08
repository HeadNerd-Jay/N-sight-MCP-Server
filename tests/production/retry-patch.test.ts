import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryPatch } from "../../src/tools/production/retry-patch.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("retry_patch", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await retryPatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("retry_patch");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await retryPatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await retryPatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls retry_patch with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await retryPatch(mockClient, mockAudit, { device_id: 3, patch_id: 77, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "retry_patch", deviceid: 3, patchid: 77 });
  });

  it("returns success JSON with device_id, patch_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await retryPatch(mockClient, mockAudit, { device_id: 3, patch_id: 77, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(3);
    expect(result.patch_id).toBe(77);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(retryPatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
