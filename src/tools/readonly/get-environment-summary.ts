/**
 * Tool: get_environment_summary  [READ-ONLY]
 * Aggregate tool — returns a high-level health and inventory snapshot
 * across the entire N-sight account in a single call.
 *
 * Designed as the ideal "morning briefing" tool — answers
 * "what's the state of my entire environment?" in one shot.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const getEnvironmentSummaryTool: Tool = {
  name: "get_environment_summary",
  description:
    "Return a full health and inventory snapshot of the entire N-sight account. " +
    "Includes: total clients, total sites, total devices (online vs offline), " +
    "total failing checks by client, and a per-client breakdown. " +
    "Use this for morning briefings, executive summaries, or any time the user asks " +
    "'what's the state of my environment?', 'give me a health overview', or similar. " +
    "Single call — no IDs required.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function getEnvironmentSummary(
  client: NsightClient,
  _args: Record<string, never>
): Promise<string> {
  // Step 1: get all clients + failing checks in parallel
  const [clientsResult, failingChecksResult] = await Promise.all([
    client.call({ service: "list_clients" }),
    client.call({ service: "list_failing_checks" }).catch(() => ({})),
  ]);

  const rawClients = (clientsResult as any).client;
  const clients: any[] = Array.isArray(rawClients)
    ? rawClients
    : rawClients
    ? [rawClients]
    : [];

  const rawChecks = (failingChecksResult as any).check;
  const failingChecks: any[] = Array.isArray(rawChecks)
    ? rawChecks
    : rawChecks
    ? [rawChecks]
    : [];

  if (clients.length === 0) {
    return JSON.stringify({
      total_clients: 0,
      total_sites: 0,
      total_devices: 0,
      online_devices: 0,
      offline_devices: 0,
      total_failing_checks: 0,
      clients: [],
    }, null, 2);
  }

  // Step 2: get sites for all clients in parallel
  const siteResults = await Promise.all(
    clients.map(async (c) => {
      try {
        const result = await client.call({ service: "list_sites", clientid: Number(c.clientid) });
        const rawSites = (result as any).site;
        const sites: any[] = Array.isArray(rawSites) ? rawSites : rawSites ? [rawSites] : [];
        return { clientId: Number(c.clientid), sites };
      } catch {
        return { clientId: Number(c.clientid), sites: [] };
      }
    })
  );

  const sitesByClient = Object.fromEntries(
    siteResults.map(({ clientId, sites }) => [clientId, sites])
  );

  // Step 3: get device counts for all sites in parallel
  const allSites = siteResults.flatMap(({ clientId, sites }) =>
    sites.map((s: any) => ({ clientId, siteId: Number(s.siteid) }))
  );

  const deviceCountByClient: Record<number, { total: number; online: number; offline: number }> = {};
  for (const c of clients) {
    deviceCountByClient[Number(c.clientid)] = { total: 0, online: 0, offline: 0 };
  }

  await Promise.all(
    allSites.map(async ({ clientId, siteId }) => {
      try {
        const [serversResult, workstationsResult] = await Promise.all([
          client.call({ service: "list_servers", siteid: siteId }).catch(() => ({})),
          client.call({ service: "list_workstations", siteid: siteId }).catch(() => ({})),
        ]);
        const rawServers = (serversResult as any).server;
        const servers: any[] = Array.isArray(rawServers) ? rawServers : rawServers ? [rawServers] : [];
        const rawWS = (workstationsResult as any).workstation;
        const workstations: any[] = Array.isArray(rawWS) ? rawWS : rawWS ? [rawWS] : [];

        for (const d of [...servers, ...workstations]) {
          const online = d.online === "1" || d.online === 1;
          deviceCountByClient[clientId].total++;
          if (online) deviceCountByClient[clientId].online++;
          else deviceCountByClient[clientId].offline++;
        }
      } catch {
        // skip
      }
    })
  );

  // Step 4: count failing checks per client
  const failingChecksByClient: Record<number, number> = {};
  for (const check of failingChecks) {
    const cid = Number(check.clientid ?? check.client_id ?? 0);
    if (cid) failingChecksByClient[cid] = (failingChecksByClient[cid] ?? 0) + 1;
  }

  // Step 5: assemble per-client summary
  const clientSummaries = clients.map((c) => {
    const cid = Number(c.clientid);
    const sites = sitesByClient[cid] ?? [];
    const devices = deviceCountByClient[cid] ?? { total: 0, online: 0, offline: 0 };
    const failing = failingChecksByClient[cid] ?? 0;
    return {
      client_id: cid,
      client_name: String(c.name),
      sites: sites.length,
      devices: devices.total,
      online: devices.online,
      offline: devices.offline,
      failing_checks: failing,
      health: failing === 0 && devices.offline === 0
        ? "healthy"
        : failing > 0 || devices.offline > 0
        ? "attention_needed"
        : "unknown",
    };
  }).sort((a, b) => b.failing_checks - a.failing_checks || a.client_name.localeCompare(b.client_name));

  const totalDevices = Object.values(deviceCountByClient).reduce((s, d) => s + d.total, 0);
  const totalOnline = Object.values(deviceCountByClient).reduce((s, d) => s + d.online, 0);
  const totalSites = allSites.length;

  return JSON.stringify(
    {
      total_clients: clients.length,
      total_sites: totalSites,
      total_devices: totalDevices,
      online_devices: totalOnline,
      offline_devices: totalDevices - totalOnline,
      total_failing_checks: failingChecks.length,
      clients_needing_attention: clientSummaries.filter((c) => c.health === "attention_needed").length,
      clients: clientSummaries,
    },
    null,
    2
  );
}
