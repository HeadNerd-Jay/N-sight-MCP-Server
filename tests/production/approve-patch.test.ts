import { describe, it, expect, vi, beforeEach } from "vitest";
import { approvePatch } from "../../src/tools/production/approve-patch.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("approve_patch", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await approvePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("approve_patch");
    expect(result.device_id).toBe(1);
    expect(result.patch_id).toBe(2);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await approvePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await approvePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls approve_patch with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await approvePatch(mockClient, mockAudit, { device_id: 10, patch_id: 99, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "approve_patch", deviceid: 10, patchid: 99 });
  });

  it("returns success JSON with device_id, patch_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await approvePatch(mockClient, mockAudit, { device_id: 10, patch_id: 99, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(10);
    expect(result.patch_id).toBe(99);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(approvePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
