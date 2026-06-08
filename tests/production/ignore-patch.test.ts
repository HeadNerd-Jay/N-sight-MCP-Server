import { describe, it, expect, vi, beforeEach } from "vitest";
import { ignorePatch } from "../../src/tools/production/ignore-patch.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("ignore_patch", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await ignorePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("ignore_patch");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await ignorePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await ignorePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls ignore_patch with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await ignorePatch(mockClient, mockAudit, { device_id: 5, patch_id: 88, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "ignore_patch", deviceid: 5, patchid: 88 });
  });

  it("returns success JSON with device_id, patch_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await ignorePatch(mockClient, mockAudit, { device_id: 5, patch_id: 88, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(5);
    expect(result.patch_id).toBe(88);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(ignorePatch(mockClient, mockAudit, { device_id: 1, patch_id: 2, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
