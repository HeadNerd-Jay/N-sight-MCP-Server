/**
 * Tool: list_backup_history  [READ-ONLY]
 * Maps to N-sight service: list_backup_history
 * Docs: https://developer.n-able.com/n-sight/docs/listing-backup-check-history
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listBackupHistoryTool: Tool = {
  name: "list_backup_history",
  description:
    "List the status of Backup checks on a device over the last 90 days. " +
    "Includes check names and a daily history (date and status, e.g. PASS, FAIL, NOTRUN, OVERDUE).",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
      offset: {
        type: "boolean",
        default: false,
        description:
          "Offsets the check status for a particular day so that the status reflects the state of the backup rather than the check run.",
      },
    },
    required: ["deviceid"],
  },
};

export async function listBackupHistory(
  client: NsightClient,
  args: { deviceid: number; offset?: boolean }
): Promise<string> {
  const offset = args.offset ?? false;
  const result = await client.call({
    service: "list_backup_history",
    deviceid: args.deviceid,
    offset: offset ? "true" : "false",
  });

  // Extract check names
  const rawChecks = (result as any).checks?.name;
  const checkNames = Array.isArray(rawChecks)
    ? rawChecks.map(String)
    : rawChecks
    ? [String(rawChecks)]
    : [];

  // Extract daily status entries
  const rawDays = (result as any).days?.day;
  const daysList = Array.isArray(rawDays) ? rawDays : rawDays ? [rawDays] : [];

  if (daysList.length === 0 && checkNames.length === 0) {
    return `No backup check history found for device ID ${args.deviceid}.`;
  }

  const formattedDays = daysList.map((d) => ({
    date: String(d.date),
    status: String(d.status),
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      offset_applied: offset,
      configured_backup_checks: checkNames,
      history: formattedDays,
    },
    null,
    2
  );
}
