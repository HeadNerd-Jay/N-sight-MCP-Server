/**
 * Tool: list_outages  [READ-ONLY]
 * Maps to N-sight service: list_outages (list_outages_arsenal)
 * Docs: https://developer.n-able.com/n-sight/docs/listing-outages
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listOutagesTool: Tool = {
  name: "list_outages",
  description:
    "List outages for a specific device that are currently open or were closed in the last 61 days. " +
    "Provides start/end times, reason (e.g. check failure or device offline), and details of the failing check if applicable.",
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

export async function listOutages(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_outages",
    deviceid: args.deviceid,
  });

  const raw = (result as any).outage;
  const outagesList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (outagesList.length === 0) {
    return `No outages found for device ID ${args.deviceid} in the last 61 days.`;
  }

  const formatted = outagesList.map((o) => ({
    reason: String(o.reason),
    state: String(o.state),
    utc_start: o.utc_start ?? null,
    utc_end: o.utc_end ?? null,
    check_id: o.check_id ? Number(o.check_id) : null,
    check_type_id: o.check_type ? Number(o.check_type) : null,
    check_description: o.check_description ?? null,
    check_status: o.check_status ?? null,
    check_frequency: o.check_frequency ?? null,
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      total_outages: formatted.length,
      outages: formatted,
    },
    null,
    2
  );
}
