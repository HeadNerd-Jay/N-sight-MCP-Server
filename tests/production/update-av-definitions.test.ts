import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAVDefinitions } from "../../src/tools/production/update-av-definitions.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("update_av_definitions", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await updateAVDefinitions(mockClient, mockAudit, { device_id: 5, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("update_av_definitions");
    expect(result.device_id).toBe(5);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await updateAVDefinitions(mockClient, mockAudit, { device_id: 5, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await updateAVDefinitions(mockClient, mockAudit, { device_id: 5, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls update_managed_antivirus_definitions with correct device_id", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await updateAVDefinitions(mockClient, mockAudit, { device_id: 33, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "update_managed_antivirus_definitions", deviceid: 33 });
  });

  it("returns success JSON with device_id and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await updateAVDefinitions(mockClient, mockAudit, { device_id: 33, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(33);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(updateAVDefinitions(mockClient, mockAudit, { device_id: 1, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
