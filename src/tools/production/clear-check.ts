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
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    return `Action not confirmed. Set confirm: true to clear check ID ${args.check_id} on device ID ${args.device_id}.`;
  }

  await audit.log({ action: "clear_check", operator: operatorId ?? "unknown", params: args });
  await client.call({ service: "clear_a_check", checkid: args.check_id, deviceid: args.device_id });
  return `Check ID ${args.check_id} on device ID ${args.device_id} cleared successfully.`;
}
