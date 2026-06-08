import { describe, it, expect, vi, beforeEach } from "vitest";
import { removeQuarantineItem } from "../../src/tools/production/remove-quarantine-item.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("remove_quarantine_item", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await removeQuarantineItem(mockClient, mockAudit, { device_id: 1, quarantine_id: 2, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("remove_quarantine_item");
    expect(result.quarantine_id).toBe(2);
  });

  it("warns about irreversibility in pending message", async () => {
    const result = JSON.parse(await removeQuarantineItem(mockClient, mockAudit, { device_id: 1, quarantine_id: 2, confirm: false }));
    expect(result.message.toLowerCase()).toContain("cannot be undone");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await removeQuarantineItem(mockClient, mockAudit, { device_id: 1, quarantine_id: 2, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await removeQuarantineItem(mockClient, mockAudit, { device_id: 1, quarantine_id: 2, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls remove_managed_antivirus_quarantine_item with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await removeQuarantineItem(mockClient, mockAudit, { device_id: 10, quarantine_id: 66, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({
      service: "remove_managed_antivirus_quarantine_item",
      deviceid: 10,
      quarantineid: 66,
    });
  });

  it("returns success JSON with device_id, quarantine_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await removeQuarantineItem(mockClient, mockAudit, { device_id: 10, quarantine_id: 66, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(10);
    expect(result.quarantine_id).toBe(66);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(removeQuarantineItem(mockClient, mockAudit, { device_id: 1, quarantine_id: 2, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
