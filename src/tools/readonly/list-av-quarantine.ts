/**
 * Tool: list_av_quarantine  [READ-ONLY]
 * Maps to N-sight service: list_mav_quarantine
 * Docs: https://developer.n-able.com/n-sight/docs/listing-managed-antivirus-quarantine
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listAVQuarantineTool: Tool = {
  name: "list_av_quarantine",
  description:
    "List items currently held in the Managed Antivirus (MAV) quarantine on a device.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
      items: {
        type: "string",
        enum: ["CURRENT", "PREVIOUS", "ALL"],
        default: "CURRENT",
        description: "Which quarantine items to list (CURRENT, PREVIOUS, or ALL).",
      },
      engine_version: {
        type: "number",
        enum: [1, 2],
        default: 2,
        description: "Antivirus engine version: 1 for Vipre, 2 for Bitdefender (recommended, default).",
      },
    },
    required: ["deviceid"],
  },
};

export async function listAVQuarantine(
  client: NsightClient,
  args: { deviceid: number; items?: "CURRENT" | "PREVIOUS" | "ALL"; engine_version?: number }
): Promise<string> {
  const v = args.engine_version ?? 2;
  const items = args.items ?? "CURRENT";
  const result = await client.call({
    service: "list_mav_quarantine",
    deviceid: args.deviceid,
    items,
    v,
  });

  const raw = (result as any).quarantine;
  const quarantineList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (quarantineList.length === 0) {
    return `No quarantined items found for device ID ${args.deviceid}.`;
  }

  const formatted = quarantineList.map((q) => ({
    quarantine_id: q.quarantineid ? Number(q.quarantineid) : null,
    threat_name: String(q.threatName ?? q.name ?? "Unknown Threat"),
    file_path: String(q.filePath ?? q.path ?? ""),
    status: String(q.statusLabel ?? q.status ?? ""),
    quarantined_time: q.quarantinedTime ?? q.date ?? null,
    can_release: q.canRelease === "1",
    can_delete: q.canDelete === "1",
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      engine_version: v,
      items_scope: items,
      total_quarantined: formatted.length,
      quarantined_items: formatted,
    },
    null,
    2
  );
}
