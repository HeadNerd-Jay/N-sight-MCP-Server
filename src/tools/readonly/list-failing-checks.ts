/**
 * Tool: list_failing_checks  [READ-ONLY]
 * Maps to N-sight service: list_failing_checks
 * Docs: https://developer.n-able.com/n-sight/docs/listing-failing-checks
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listFailingChecksTool: Tool = {
  name: "list_failing_checks",
  description:
    "List all failing checks (monitors) across all managed clients, or filter to a specific client. " +
    "Returns device name, check description, failure time, formatted output, and check status. " +
    "Use this for morning health briefs, triage, and identifying which devices need attention.",
  inputSchema: {
    type: "object",
    properties: {
      clientid: {
        type: "number",
        description: "Optional. Filter to a specific client by N-sight client ID. Recommended for large accounts.",
      },
      check_type: {
        type: "string",
        enum: ["checks", "tasks", "random"],
        description: "'checks' = monitors only, 'tasks' = automated task failures only, 'random' = all.",
      },
    },
    required: [],
  },
};

export async function listFailingChecks(
  client: NsightClient,
  args: { clientid?: number; check_type?: string }
): Promise<string> {
  const result = await client.call({
    service: "list_failing_checks",
    ...(args.clientid ? { clientid: args.clientid } : {}),
    ...(args.check_type ? { check_type: args.check_type } : {}),
  });

  const failures: Array<Record<string, unknown>> = [];
  const clients = Array.isArray(result.client) ? result.client : result.client ? [result.client] : [];

  for (const c of clients as any[]) {
    const sites = Array.isArray(c.site) ? c.site : c.site ? [c.site] : [];
    for (const site of sites) {
      for (const [deviceType, deviceKey] of [["servers", "server"], ["workstations", "workstation"]]) {
        const container = site[deviceType];
        if (!container) continue;
        const devices = Array.isArray(container[deviceKey]) ? container[deviceKey] : container[deviceKey] ? [container[deviceKey]] : [];
        for (const device of devices) {
          const checks = device?.failed_checks?.check;
          const failedChecks = Array.isArray(checks) ? checks : checks ? [checks] : [];
          for (const check of failedChecks) {
            failures.push({
              client: c.name, site: site.name, device: device.name,
              device_type: deviceKey,
              check_id: check.checkid, description: check.description,
              status: check.checkstatus, last_failed: `${check.date} ${check.time}`,
              output: check.formatted_output,
              offline: device.offline?.description ?? null,
            });
          }
        }
      }
    }
  }

  if (failures.length === 0) return JSON.stringify({ total_failures: 0, failures: [] }, null, 2);
  return JSON.stringify({ total_failures: failures.length, failures }, null, 2);
}
