/**
 * Tool: remove_quarantine_item  [PRODUCTION ONLY]
 * Maps to N-sight service: remove_managed_antivirus_quarantine_item
 * Docs: https://developer.n-able.com/n-sight/docs/remove-managed-antivirus-quarantine-item
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const removeQuarantineItemTool: Tool = {
  name: "remove_quarantine_item",
  description:
    "Permanently delete a quarantined file from a device. This cannot be undone. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      quarantine_id: { type: "number", description: "The quarantine item ID to permanently delete. Obtain from list_av_quarantine." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "quarantine_id", "confirm"],
  },
};

export async function removeQuarantineItem(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; quarantine_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("warning", `remove_quarantine_item: confirmation required — quarantine ID ${args.quarantine_id} NOT deleted (irreversible action).`);
    return JSON.stringify({
      action: "remove_quarantine_item",
      status: "pending_confirmation",
      device_id: args.device_id,
      quarantine_id: args.quarantine_id,
      message: "Action not confirmed. Set confirm: true to permanently delete this quarantined file. This cannot be undone.",
    }, null, 2);
  }

  await ctx?.log("warning", `remove_quarantine_item: PERMANENT DELETE — writing audit log for quarantine ID ${args.quarantine_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "remove_quarantine_item", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `remove_quarantine_item: calling N-sight API to permanently delete quarantine ID ${args.quarantine_id}...`);
  await ctx?.progress(2, 3);
  await client.call({
    service: "remove_managed_antivirus_quarantine_item",
    deviceid: args.device_id,
    quarantineid: args.quarantine_id,
  });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `remove_quarantine_item: quarantine ID ${args.quarantine_id} permanently deleted.`);

  return JSON.stringify({
    action: "remove_quarantine_item",
    status: "success",
    device_id: args.device_id,
    quarantine_id: args.quarantine_id,
    message: "Quarantined file permanently deleted.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
