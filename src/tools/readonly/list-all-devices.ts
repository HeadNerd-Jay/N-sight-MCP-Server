/**
 * Tool: list_all_devices  [READ-ONLY]
 * Aggregate tool — traverses clients → sites → devices internally.
 *
 * Replaces the 3-hop manual pattern (list_clients → list_sites → list_devices)
 * with a single tool call. The LLM does not need to discover client or site IDs first.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listAllDevicesTool: Tool = {
  name: "list_all_devices",
  description:
    "List every device (servers and workstations) across ALL clients and sites in the N-sight account. " +
    "Use this when the user asks for a full device inventory, total device count, or 'all devices' without specifying a client or site. " +
    "Handles the client → site → device traversal internally — no IDs needed. " +
    "Each device record includes client name, site name, device ID, type, name, online status, OS, and IP address.",
  inputSchema: {
    type: "object",
    properties: {
      online_only: {
        type: "boolean",
        description: "If true, return only online devices. Default: false (return all).",
      },
    },
    required: [],
  },
};

export async function listAllDevices(
  client: NsightClient,
  args: { online_only?: boolean }
): Promise<string> {
  const onlineOnly = args.online_only ?? false;

  // Step 1: get all clients
  const clientsResult = await client.call({ service: "list_clients" });
  const rawClients = (clientsResult as any).client;
  const clients: any[] = Array.isArray(rawClients)
    ? rawClients
    : rawClients
    ? [rawClients]
    : [];

  if (clients.length === 0) {
    return JSON.stringify({ total_devices: 0, devices: [] }, null, 2);
  }

  // Step 2: get all sites for all clients in parallel
  const siteResults = await Promise.all(
    clients.map(async (c) => {
      try {
        const result = await client.call({ service: "list_sites", clientid: Number(c.clientid) });
        const rawSites = (result as any).site;
        const sites: any[] = Array.isArray(rawSites) ? rawSites : rawSites ? [rawSites] : [];
        return { clientId: Number(c.clientid), clientName: String(c.name), sites };
      } catch {
        return { clientId: Number(c.clientid), clientName: String(c.name), sites: [] };
      }
    })
  );

  // Step 3: get all devices for all sites in parallel
  const allDevices: any[] = [];

  const deviceFetches = siteResults.flatMap(({ clientId, clientName, sites }) =>
    sites.map(async (s: any) => {
      const siteId = Number(s.siteid);
      const siteName = String(s.name);
      try {
        const [serversResult, workstationsResult] = await Promise.all([
          client.call({ service: "list_servers", siteid: siteId }).catch(() => ({})),
          client.call({ service: "list_workstations", siteid: siteId }).catch(() => ({})),
        ]);

        const rawServers = (serversResult as any).server;
        const servers: any[] = Array.isArray(rawServers) ? rawServers : rawServers ? [rawServers] : [];

        const rawWorkstations = (workstationsResult as any).workstation;
        const workstations: any[] = Array.isArray(rawWorkstations)
          ? rawWorkstations
          : rawWorkstations
          ? [rawWorkstations]
          : [];

        for (const s of servers) {
          const online = s.online === "1" || s.online === 1;
          if (onlineOnly && !online) continue;
          allDevices.push({
            client_id: clientId,
            client_name: clientName,
            site_id: siteId,
            site_name: siteName,
            device_id: Number(s.serverid),
            device_type: "server",
            name: String(s.name),
            online,
            ip_address: s.ipaddress ?? null,
            os_description: s.osdesc ?? null,
          });
        }

        for (const w of workstations) {
          const online = w.online === "1" || w.online === 1;
          if (onlineOnly && !online) continue;
          allDevices.push({
            client_id: clientId,
            client_name: clientName,
            site_id: siteId,
            site_name: siteName,
            device_id: Number(w.workstationid),
            device_type: "workstation",
            name: String(w.name),
            online,
            ip_address: w.ipaddress ?? null,
            os_description: w.osdesc ?? null,
          });
        }
      } catch {
        // skip unreachable sites silently
      }
    })
  );

  await Promise.all(deviceFetches);

  // sort: client name, then site name, then device name
  allDevices.sort((a, b) =>
    a.client_name.localeCompare(b.client_name) ||
    a.site_name.localeCompare(b.site_name) ||
    a.name.localeCompare(b.name)
  );

  const onlineCount = allDevices.filter((d) => d.online).length;

  return JSON.stringify(
    {
      total_devices: allDevices.length,
      online: onlineCount,
      offline: allDevices.length - onlineCount,
      devices: allDevices,
    },
    null,
    2
  );
}
