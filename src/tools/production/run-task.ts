/**
 * Tool: run_task  [PRODUCTION ONLY]
 * Maps to N-sight service: run_task
 * Docs: https://developer.n-able.com/n-sight/docs/run-task
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const runTaskTool: Tool = {
  name: "run_task",
  description:
    "Immediately run a scheduled task (automated script) on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      task_id: { type: "number", description: "The task ID to run. Obtain from list_checks (type: task)." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "task_id", "confirm"],
  },
};

export async function runTask(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; task_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `run_task: confirmation required — task ID ${args.task_id} on device ID ${args.device_id} not triggered.`);
    return JSON.stringify({
      action: "run_task",
      status: "pending_confirmation",
      device_id: args.device_id,
      task_id: args.task_id,
      message: "Action not confirmed. Set confirm: true to run this task immediately.",
    }, null, 2);
  }

  await ctx?.log("info", `run_task: writing audit log for task ID ${args.task_id} on device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "run_task", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `run_task: calling N-sight API to trigger task ID ${args.task_id}...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "run_task", deviceid: args.device_id, taskid: args.task_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `run_task: task ID ${args.task_id} triggered on device ID ${args.device_id}.`);

  return JSON.stringify({
    action: "run_task",
    status: "success",
    device_id: args.device_id,
    task_id: args.task_id,
    message: "Task triggered successfully. Use list_checks to monitor the result.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
