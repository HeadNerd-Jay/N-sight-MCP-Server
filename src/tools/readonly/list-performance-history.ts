/**
 * Tool: list_performance_history  [READ-ONLY]
 * Maps to N-sight service: list_performance_history
 * Docs: https://developer.n-able.com/n-sight/docs/listing-performance-history
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listPerformanceHistoryTool: Tool = {
  name: "list_performance_history",
  description:
    "List historical performance and bandwidth monitoring metrics (CPU usage, memory usage, network traffic) for a device.",
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

export async function listPerformanceHistory(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_performance_history",
    deviceid: args.deviceid,
  });

  return JSON.stringify(
    {
      device_id: args.deviceid,
      data: result,
    },
    null,
    2
  );
}
