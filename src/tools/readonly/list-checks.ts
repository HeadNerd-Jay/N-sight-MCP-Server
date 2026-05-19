/**
 * Tool: list_checks  [READ-ONLY]
 * Maps to N-sight service: list_checks (list_checks_arsenal)
 * Docs: https://developer.n-able.com/n-sight/docs/listing-checks
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listChecksTool: Tool = {
  name: "list_checks",
  description:
    "List all monitoring checks (e.g. Disk Space, Ping, Windows Service, Backup, etc.) configured for a specific device. " +
    "Returns check IDs, descriptions, types, and current status details.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device (server or workstation).",
      },
    },
    required: ["deviceid"],
  },
};

export async function listChecks(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_checks",
    deviceid: args.deviceid,
  });

  const raw = (result as any).check;
  const checksList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (checksList.length === 0) {
    return `No checks found for device ID ${args.deviceid}.`;
  }

  const formatted = checksList.map((c) => {
    // Map check types based on description schema
    const checkTypesMap: Record<number, string> = {
      1001: "Anti-virus Update Check",
      1002: "Backup Check",
      1003: "Drive Space Change Check",
      1004: "Disk Space Check",
      1005: "Exchange Store Size Check",
      1006: "Failed Login Check",
      1007: "Performance Monitoring Check",
      1008: "Physical Disk Health Check",
      1009: "Physical Memory Health Check",
      1010: "PING Check",
      1011: "TCP Service Check",
      1012: "Web Page Check",
      1013: "Windows Service Check",
      1014: "Critical Events Check",
      1015: "SNMP Check",
    };

    const typeId = Number(c.check_type);
    const typeLabel = checkTypesMap[typeId] || `Unknown Check Type (${typeId})`;

    return {
      check_id: Number(c.checkid),
      uid: c.uid ? Number(c.uid) : null,
      description: String(c.description),
      status: Number(c.statusid) === 0 ? "PASS" : Number(c.statusid) === 1 ? "FAIL" : "CLEARED / UNKNOWN",
      status_id: Number(c.statusid),
      last_run_date: c.date ?? null,
      last_run_time: c.time ?? null,
      utc_run: c.utc_run ?? null,
      email_alerts: c.email === "1",
      sms_alerts: c.sms === "1",
      check_type_id: typeId,
      check_type_name: typeLabel,
      consecutive_fails: c.consecutive_fails ? Number(c.consecutive_fails) : 0,
      is_24_7: c.dsc_247 === "1",
    };
  });

  return JSON.stringify(
    {
      device_id: args.deviceid,
      total_checks: formatted.length,
      checks: formatted,
    },
    null,
    2
  );
}
