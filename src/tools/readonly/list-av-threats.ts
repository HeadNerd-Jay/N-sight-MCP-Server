/**
 * Tool: list_av_threats  [READ-ONLY]
 * Maps to N-sight service: list_mav_threats
 * Docs: https://developer.n-able.com/n-sight/docs/listing-managed-antivirus-threats
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listAVThreatsTool: Tool = {
  name: "list_av_threats",
  description:
    "List recently detected antivirus threats on a device. " +
    "Returns threat details such as name, file path, status, and detection timestamp.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
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

export async function listAVThreats(
  client: NsightClient,
  args: { deviceid: number; engine_version?: number }
): Promise<string> {
  const v = args.engine_version ?? 2;
  const result = await client.call({
    service: "list_mav_threats",
    deviceid: args.deviceid,
    v,
  });

  const raw = (result as any).threat;
  const threatsList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (threatsList.length === 0) {
    return `No MAV threats found for device ID ${args.deviceid}.`;
  }

  const formatted = threatsList.map((t) => ({
    threat_id: t.threatid ? Number(t.threatid) : null,
    name: String(t.threatName ?? t.name ?? "Unknown Threat"),
    file_path: String(t.filePath ?? t.path ?? ""),
    status: String(t.statusLabel ?? t.status ?? ""),
    detected_time: t.detectedTime ?? t.date ?? null,
    action_taken: t.actionTaken ?? null,
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      engine_version: v,
      total_threats: formatted.length,
      threats: formatted,
    },
    null,
    2
  );
}
