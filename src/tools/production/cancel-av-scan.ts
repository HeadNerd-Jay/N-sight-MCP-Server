/**
 * Tool: cancel_av_scan  [PRODUCTION ONLY]
 * Maps to N-sight service: cancel_managed_antivirus_scan
 * Docs: https://developer.n-able.com/n-sight/docs/cancel-managed-antivirus-scan
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const cancelAVScanTool: Tool = {
  name: "cancel_av_scan",
  description:
    "Cancel an in-progress antivirus scan on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID with the running scan. Obtain from list_devices." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "confirm"],
  },
};

export async function cancelAVScan(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `cancel_av_scan: confirmation required — scan on device ID ${args.device_id} not cancelled.`);
    return JSON.stringify({
      action: "cancel_av_scan",
      status: "pending_confirmation",
      device_id: args.device_id,
      message: "Action not confirmed. Set confirm: true to cancel the in-progress AV scan.",
    }, null, 2);
  }

  await ctx?.log("info", `cancel_av_scan: writing audit log for device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "cancel_av_scan", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `cancel_av_scan: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "cancel_managed_antivirus_scan", deviceid: args.device_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `cancel_av_scan: scan cancelled on device ID ${args.device_id}.`);

  return JSON.stringify({
    action: "cancel_av_scan",
    status: "success",
    device_id: args.device_id,
    message: "Antivirus scan cancelled successfully.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
