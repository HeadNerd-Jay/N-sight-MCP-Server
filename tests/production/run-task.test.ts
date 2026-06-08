import { describe, it, expect, vi, beforeEach } from "vitest";
import { runTask } from "../../src/tools/production/run-task.js";
import { NsightClient } from "../../src/core/client.js";
import { AuditLogger } from "../../src/core/audit.js";

const mockClient = { call: vi.fn() } as unknown as NsightClient;
const mockAudit = { log: vi.fn() } as unknown as AuditLogger;

beforeEach(() => vi.clearAllMocks());

describe("run_task", () => {
  it("returns pending_confirmation when confirm is false", async () => {
    const result = JSON.parse(await runTask(mockClient, mockAudit, { device_id: 1, task_id: 9, confirm: false }));
    expect(result.status).toBe("pending_confirmation");
    expect(result.action).toBe("run_task");
    expect(result.task_id).toBe(9);
  });

  it("does not call API or audit when unconfirmed", async () => {
    await runTask(mockClient, mockAudit, { device_id: 1, task_id: 9, confirm: false });
    expect(mockClient.call).not.toHaveBeenCalled();
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it("logs to audit BEFORE calling the API", async () => {
    const callOrder: string[] = [];
    (mockAudit.log as any).mockImplementation(async () => { callOrder.push("audit"); });
    (mockClient.call as any).mockImplementation(async () => { callOrder.push("api"); return {}; });
    await runTask(mockClient, mockAudit, { device_id: 1, task_id: 9, confirm: true });
    expect(callOrder).toEqual(["audit", "api"]);
  });

  it("calls run_task with correct params", async () => {
    (mockClient.call as any).mockResolvedValue({});
    await runTask(mockClient, mockAudit, { device_id: 15, task_id: 300, confirm: true });
    expect(mockClient.call).toHaveBeenCalledWith({ service: "run_task", deviceid: 15, taskid: 300 });
  });

  it("returns success JSON with device_id, task_id, and timestamp", async () => {
    (mockClient.call as any).mockResolvedValue({});
    const result = JSON.parse(await runTask(mockClient, mockAudit, { device_id: 15, task_id: 300, confirm: true }));
    expect(result.status).toBe("success");
    expect(result.device_id).toBe(15);
    expect(result.task_id).toBe(300);
    expect(result.timestamp).toBeDefined();
  });

  it("propagates API errors", async () => {
    (mockClient.call as any).mockRejectedValue(new Error("N-sight API error: 500"));
    await expect(runTask(mockClient, mockAudit, { device_id: 1, task_id: 9, confirm: true }))
      .rejects.toThrow("N-sight API error: 500");
  });
});
