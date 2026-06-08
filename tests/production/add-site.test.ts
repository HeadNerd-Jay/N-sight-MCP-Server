import { describe, it, expect, vi, beforeEach } from "vitest";
import { addSite } from "../../src/tools/production/add-site.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("add_site", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("add_site");
    expect(result.client_id).toBe(10);
    expect(result.name).toBe("HQ");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return { siteid: "200" }; });
    await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls add_site with correct client_id and name", async () => {
    (mockClient.call as any).mockResolvedValue({ siteid: "200" });
    await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "add_site", clientid: 10, name: "HQ" });
  });

  it("returns success JSON with new site_id, client_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({ siteid: "200" });
    const result = JSON.parse(await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.site_id).toBe(200);
    expect(result.client_id).toBe(10);
    expect(result.name).toBe("HQ");
    expect(result.timestamp).toBeDefined();
  });

  it("handles null site_id when API does not return one", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.site_id).toBeNull();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(addSite(mockClient, mockAudit, { client_id: 10, name: "HQ", confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
