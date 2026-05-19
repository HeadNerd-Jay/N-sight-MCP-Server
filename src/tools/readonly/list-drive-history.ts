/**
 * Tool: list_drive_history  [READ-ONLY]
 * Maps to N-sight service: list_drive_space_history
 * Docs: https://developer.n-able.com/n-sight/docs/listing-drive-space-history
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient, NsightRequestParams } from "../../core/client.js";

export const listDriveHistoryTool: Tool = {
  name: "list_drive_history",
  description:
    "List historical disk drive space usage (total size and free space) over time for a given device. " +
    "Requires deviceid and interval ('DAY', 'WEEK', or 'MONTH'). Optional 'since' date parameter.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
      interval: {
        type: "string",
        enum: ["DAY", "WEEK", "MONTH"],
        description: "Historical recording interval: DAY, WEEK, or MONTH.",
      },
      since: {
        type: "string",
        description: "Optional start date/time (e.g. YYYY-MM-DD or YYYY-MM-DD HH:MM:SS) to retrieve data since.",
      },
    },
    required: ["deviceid", "interval"],
  },
};

export async function listDriveHistory(
  client: NsightClient,
  args: { deviceid: number; interval: "DAY" | "WEEK" | "MONTH"; since?: string }
): Promise<string> {
  const params: NsightRequestParams = {
    service: "list_drive_space_history",
    deviceid: args.deviceid,
    interval: args.interval,
  };
  if (args.since) {
    params.since = args.since;
  }

  const result = await client.call(params);

  // Return the raw/formatted output representing drive history
  // Since drive history responses can be nested (e.g., drives/drive/history), we return a representation of the result
  return JSON.stringify(
    {
      device_id: args.deviceid,
      interval: args.interval,
      since: args.since ?? null,
      data: result,
    },
    null,
    2
  );
}
