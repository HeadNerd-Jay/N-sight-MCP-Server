/**
 * Tool: clear_check  [PRODUCTION ONLY]
 * Maps to N-sight service: clear_a_check
 * Docs: https://developer.n-able.com/n-sight/docs/clear-a-check
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const clearCheckTool: Tool = {
  name: "clear_check",
  description:
    "Clear (acknowledge) a failing check on a specific device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      check_id: { type: "number", description: "The check ID to clear. Obtain from list_failing_checks." },
      device_id: { type: "number", description: "The device ID the check belongs to." },
      confirm: { type: "boolean", description: "Must be true to execute. If false or omitted, action will not run." },
    },
    required: ["check_id", "device_id", "confirm"],
  },
};

export async function clearCheck(
  client: NsightClient,
  audit: AuditLogger,
  args: { check_id: number; device_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `clear_check: confirmation required — check ID ${args.check_id} not cleared.`);
    return JSON.stringify({
      action: "clear_check",
      status: "pending_confirmation",
      check_id: args.check_id,
      device_id: args.device_id,
      message: "Action not confirmed. Set confirm: true to clear this check.",
    }, null, 2);
  }

  await ctx?.log("info", `clear_check: writing audit log for check ID ${args.check_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "clear_check", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `clear_check: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "clear_a_check", checkid: args.check_id, deviceid: args.device_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `clear_check: check ID ${args.check_id} cleared successfully.`);

  return JSON.stringify({
    action: "clear_check",
    status: "success",
    check_id: args.check_id,
    device_id: args.device_id,
    message: "Check cleared successfully.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
