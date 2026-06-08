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
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    return JSON.stringify({
      action: "start_av_scan",
      status: "pending_confirmation",
      device_id: args.device_id,
      scan_type: args.scan_type,
      message: `Action not confirmed. Set confirm: true to start a ${args.scan_type} scan.`,
    }, null, 2);
  }

  await audit.log({ action: "start_av_scan", operator: operatorId ?? "unknown", params: args });
  await client.call({ service: "start_managed_antivirus_scan", deviceid: args.device_id, scantype: args.scan_type });

  return JSON.stringify({
    action: "start_av_scan",
    status: "success",
    device_id: args.device_id,
    scan_type: args.scan_type,
    message: `${args.scan_type} antivirus scan started. Use list_av_scans to monitor progress.`,
    timestamp: new Date().toISOString(),
  }, null, 2);
}
