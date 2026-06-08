import { describe, it, expect, vi, beforeEach } from "vitest";
import { startAVScan } from "../../src/tools/production/start-av-scan.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("start_av_scan", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await startAVScan(mockClient, mockAudit, { device_id: 1, scan_type: "QUICK", confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("start_av_scan");
    expect(result.scan_type).toBe("QUICK");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await startAVScan(mockClient, mockAudit, { device_id: 1, scan_type: "FULL", confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await startAVScan(mockClient, mockAudit, { device_id: 1, scan_type: "QUICK", confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls start_managed_antivirus_scan with QUICK type", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await startAVScan(mockClient, mockAudit, { device_id: 20, scan_type: "QUICK", confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "start_managed_antivirus_scan", deviceid: 20, scantype: "QUICK" });
  });

  it("calls start_managed_antivirus_scan with FULL type", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await startAVScan(mockClient, mockAudit, { device_id: 20, scan_type: "FULL", confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "start_managed_antivirus_scan", deviceid: 20, scantype: "FULL" });
  });

  it("returns success JSON including scan_type and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await startAVScan(mockClient, mockAudit, { device_id: 20, scan_type: "FULL", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.scan_type).toBe("FULL");
    expect(result.device_id).toBe(20);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(startAVScan(mockClient, mockAudit, { device_id: 1, scan_type: "QUICK", confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
