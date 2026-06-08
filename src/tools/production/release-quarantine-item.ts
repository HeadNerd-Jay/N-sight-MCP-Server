/**
 * Tool: release_quarantine_item  [PRODUCTION ONLY]
 * Maps to N-sight service: release_managed_antivirus_quarantine_item
 * Docs: https://developer.n-able.com/n-sight/docs/release-managed-antivirus-quarantine-item
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";

export const releaseQuarantineItemTool: Tool = {
  name: "release_quarantine_item",
  description:
    "Release (restore) a quarantined file back to its original location on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      quarantine_id: { type: "number", description: "The quarantine item ID to release. Obtain from list_av_quarantine." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "quarantine_id", "confirm"],
  },
};

export async function releaseQuarantineItem(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; quarantine_id: number; confirm: boolean },
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    return JSON.stringify({
      action: "release_quarantine_item",
      status: "pending_confirmation",
      device_id: args.device_id,
      quarantine_id: args.quarantine_id,
      message: "Action not confirmed. Set confirm: true to restore this quarantined file.",
    }, null, 2);
  }

  await audit.log({ action: "release_quarantine_item", operator: operatorId ?? "unknown", params: args });
  await client.call({
    service: "release_managed_antivirus_quarantine_item",
    deviceid: args.device_id,
    quarantineid: args.quarantine_id,
  });

  return JSON.stringify({
    action: "release_quarantine_item",
    status: "success",
    device_id: args.device_id,
    quarantine_id: args.quarantine_id,
    message: "Quarantined file restored to its original location.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
