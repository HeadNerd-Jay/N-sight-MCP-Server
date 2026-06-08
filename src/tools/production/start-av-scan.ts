/**
 * Tool: start_av_scan  [PRODUCTION ONLY]
 * Maps to N-sight service: start_managed_antivirus_scan
 * Docs: https://developer.n-able.com/n-sight/docs/start-managed-antivirus-scan
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const startAVScanTool: Tool = {
  name: "start_av_scan",
  description:
    "Trigger an on-demand antivirus scan on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID to scan. Obtain from list_devices." },
      scan_type: {
        type: "string",
        enum: ["QUICK", "FULL"],
        description: "Type of scan: QUICK for fast scan, FULL for complete scan.",
      },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "scan_type", "confirm"],
  },
};

export async function startAVScan(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; scan_type: "QUICK" | "FULL"; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `start_av_scan: confirmation required — ${args.scan_type} scan on device ID ${args.device_id} not started.`);
    return JSON.stringify({
      action: "start_av_scan",
      status: "pending_confirmation",
      device_id: args.device_id,
      scan_type: args.scan_type,
      message: `Action not confirmed. Set confirm: true to start a ${args.scan_type} scan.`,
    }, null, 2);
  }

  await ctx?.log("info", `start_av_scan: writing audit log for ${args.scan_type} scan on device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "start_av_scan", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `start_av_scan: calling N-sight API to trigger ${args.scan_type} scan...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "start_managed_antivirus_scan", deviceid: args.device_id, scantype: args.scan_type });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `start_av_scan: ${args.scan_type} scan started on device ID ${args.device_id}.`);

  return JSON.stringify({
    action: "start_av_scan",
    status: "success",
    device_id: args.device_id,
    scan_type: args.scan_type,
    message: `${args.scan_type} antivirus scan started. Use list_av_scans to monitor progress.`,
    timestamp: new Date().toISOString(),
  }, null, 2);
}
