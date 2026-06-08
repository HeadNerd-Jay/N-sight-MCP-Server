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
  }) as any;

  // Response shape: result.history (array or single) each with date, time, cpu, memory, bandwidth fields
  const raw = result?.history;
  const entries: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (entries.length === 0) {
    return JSON.stringify({ device_id: args.deviceid, total_entries: 0, history: [] }, null, 2);
  }

  const history = entries.map((h) => ({
    date: h.date ?? null,
    time: h.time ?? null,
    cpu_usage_pct: h.cpu != null ? Number(h.cpu) : null,
    memory_usage_pct: h.memory != null ? Number(h.memory) : null,
    network_in_kbps: h.bandwidth_in != null ? Number(h.bandwidth_in) : null,
    network_out_kbps: h.bandwidth_out != null ? Number(h.bandwidth_out) : null,
  }));

  return JSON.stringify({ device_id: args.deviceid, total_entries: history.length, history }, null, 2);
}
