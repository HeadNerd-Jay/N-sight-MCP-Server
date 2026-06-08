/**
 * Tool: update_av_definitions  [PRODUCTION ONLY]
 * Maps to N-sight service: update_managed_antivirus_definitions
 * Docs: https://developer.n-able.com/n-sight/docs/update-managed-antivirus-definitions
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const updateAVDefinitionsTool: Tool = {
  name: "update_av_definitions",
  description:
    "Force an immediate antivirus definition update on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID to update. Obtain from list_devices." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "confirm"],
  },
};

export async function updateAVDefinitions(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `update_av_definitions: confirmation required — device ID ${args.device_id} not updated.`);
    return JSON.stringify({
      action: "update_av_definitions",
      status: "pending_confirmation",
      device_id: args.device_id,
      message: "Action not confirmed. Set confirm: true to trigger an AV definition update.",
    }, null, 2);
  }

  await ctx?.log("info", `update_av_definitions: writing audit log for device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "update_av_definitions", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `update_av_definitions: calling N-sight API to push definition update...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "update_managed_antivirus_definitions", deviceid: args.device_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `update_av_definitions: definition update triggered on device ID ${args.device_id}.`);

  return JSON.stringify({
    action: "update_av_definitions",
    status: "success",
    device_id: args.device_id,
    message: "Antivirus definition update triggered. Use list_av_scans to monitor progress.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
