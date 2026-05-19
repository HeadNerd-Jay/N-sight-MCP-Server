/**
 * Tool: list_backup_sessions  [READ-ONLY]
 * Maps to N-sight service: list_mob_sessions (Managed Online Backup sessions)
 * Docs: https://developer.n-able.com/n-sight/docs/listing-backup-and-recovery-sessions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listBackupSessionsTool: Tool = {
  name: "list_backup_sessions",
  description:
    "List individual backup sessions (Managed Online Backup) details for a device. " +
    "Returns plugin/type, start/end timestamps, status (e.g. COMPLETED, FAILED), transferred size in bytes, and error counts.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
    },
    required: ["deviceid"],
  },
};

export async function listBackupSessions(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_mob_sessions",
    deviceid: args.deviceid,
  });

  const raw = (result as any).session;
  const sessionsList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (sessionsList.length === 0) {
    return `No Managed Backup (MOB) sessions found for device ID ${args.deviceid}.`;
  }

  const formatted = sessionsList.map((s) => ({
    plugin: String(s.plugin ?? ""),
    status: String(s.status ?? ""),
    start_time_timestamp: s.start_time ? Number(s.start_time) : null,
    end_time_timestamp: s.end_time ? Number(s.end_time) : null,
    duration_seconds: s.duration ? Number(s.duration) : null,
    selection_size_bytes: s.selection_size ? Number(s.selection_size) : null,
    selection_item_count: s.selection_item_count ? Number(s.selection_item_count) : null,
    processed_size_bytes: s.processed_size ? Number(s.processed_size) : null,
    processed_item_count: s.processed_item_count ? Number(s.processed_item_count) : null,
    transferred_size_bytes: s.transferred_size ? Number(s.transferred_size) : null,
    size_change_bytes: s.size_change ? Number(s.size_change) : null,
    item_count_change: s.item_count_change ? Number(s.item_count_change) : null,
    removed_item_count: s.removed_item_count ? Number(s.removed_item_count) : null,
    error_count: s.error_count ? Number(s.error_count) : 0,
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      total_sessions: formatted.length,
      sessions: formatted,
    },
    null,
    2
  );
}
