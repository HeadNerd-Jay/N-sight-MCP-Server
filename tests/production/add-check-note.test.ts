import { describe, it, expect, vi, beforeEach } from "vitest";
import { addCheckNote } from "../../src/tools/production/add-check-note.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("add_check_note", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await addCheckNote(mockClient, mockAudit, { check_id: 1, note: "test note", confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("add_check_note");
    expect(result.check_id).toBe(1);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await addCheckNote(mockClient, mockAudit, { check_id: 1, note: "test", confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("truncates long notes in pending_confirmation preview", async () => {
    const longNote = "a".repeat(100);
    const result = JSON.parse(await addCheckNote(mockClient, mockAudit, { check_id: 1, note: longNote, confirm: false }));
    expect(result.note_preview.length).toBeLessThanOrEqual(82); // 80 chars + ellipsis
    expect(result.note_preview).toContain("…");
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await addCheckNote(mockClient, mockAudit, { check_id: 1, note: "hello", confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls add_check_note with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await addCheckNote(mockClient, mockAudit, { check_id: 7, note: "investigating disk issue", confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "add_check_note", checkid: 7, note: "investigating disk issue" });
  });

  it("returns success JSON with full note and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await addCheckNote(mockClient, mockAudit, { check_id: 7, note: "investigating", confirm: true }));
    expect(result.status).toBe("success");
    expect(result.note).toBe("investigating");
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(addCheckNote(mockClient, mockAudit, { check_id: 1, note: "x", confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
