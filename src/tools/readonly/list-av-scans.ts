/**
 * Tool: list_av_scans  [READ-ONLY]
 * Maps to N-sight service: list_mav_scans
 * Docs: https://developer.n-able.com/n-sight/docs/listing-managed-antivirus-scans
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listAVScansTool: Tool = {
  name: "list_av_scans",
  description:
    "List Managed Antivirus (MAV) scans run on a device. " +
    "Returns scan types, start/end times, scan status, and count of scanned items.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
      details: {
        type: "string",
        enum: ["YES", "NO"],
        default: "YES",
        description: "Set to YES to retrieve detailed scan records, NO for summary count.",
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

export async function listAVScans(
  client: NsightClient,
  args: { deviceid: number; details?: "YES" | "NO"; engine_version?: number }
): Promise<string> {
  const v = args.engine_version ?? 2;
  const details = args.details ?? "YES";
  const result = await client.call({
    service: "list_mav_scans",
    deviceid: args.deviceid,
    details,
    v,
  });

  const raw = (result as any).scan;
  const scansList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (scansList.length === 0) {
    return `No MAV scans found for device ID ${args.deviceid}.`;
  }

  const formatted = scansList.map((s) => ({
    scan_id: s.scanid ? Number(s.scanid) : null,
    type: String(s.type ?? ""),
    status: String(s.status ?? ""),
    start_time: s.startTime ?? s.start ?? null,
    end_time: s.endTime ?? s.end ?? null,
    items_scanned: s.itemsScanned ? Number(s.itemsScanned) : null,
    threats_found: s.threatsFound ? Number(s.threatsFound) : null,
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      engine_version: v,
      total_scans: formatted.length,
      scans: formatted,
    },
    null,
    2
  );
}
