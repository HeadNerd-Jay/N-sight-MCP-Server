import { describe, it, expect, vi, beforeEach } from "vitest";
import { addClient } from "../../src/tools/production/add-client.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("add_client", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("add_client");
    expect(result.name).toBe("Acme Corp");
  });

  it("does not call API or audit when unconfirmed", async () => {
    await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return { clientid: "101" }; });
    await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls add_client with correct name", async () => {
    (mockClient.call as any).mockResolvedValue({ clientid: "101" });
    await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "add_client", name: "Acme Corp" });
  });

  it("returns success JSON with new client_id from API response", async () => {
    (mockClient.call as any).mockResolvedValue({ clientid: "101" });
    const result = JSON.parse(await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.client_id).toBe(101);
    expect(result.name).toBe("Acme Corp");
    expect(result.timestamp).toBeDefined();
  });

  it("handles null client_id when API does not return one", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.client_id).toBeNull();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(addClient(mockClient, mockAudit, { name: "Acme Corp", confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
