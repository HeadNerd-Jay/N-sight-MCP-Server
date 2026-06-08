import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelAVScan } from "../../src/tools/production/cancel-av-scan.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("cancel_av_scan", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await cancelAVScan(mockClient, mockAudit, { device_id: 5, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("cancel_av_scan");
    expect(result.device_id).toBe(5);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await cancelAVScan(mockClient, mockAudit, { device_id: 5, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await cancelAVScan(mockClient, mockAudit, { device_id: 5, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls cancel_managed_antivirus_scan with correct device_id", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await cancelAVScan(mockClient, mockAudit, { device_id: 42, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "cancel_managed_antivirus_scan", deviceid: 42 });
  });

  it("returns success JSON with device_id and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await cancelAVScan(mockClient, mockAudit, { device_id: 42, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(42);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(cancelAVScan(mockClient, mockAudit, { device_id: 1, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
