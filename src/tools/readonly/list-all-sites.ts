/**
 * Tool: list_all_sites  [READ-ONLY]
 * Aggregate tool — traverses clients → sites internally.
 *
 * Replaces the 2-hop pattern (list_clients → list_sites per client)
 * with a single tool call. Returns all sites across all clients.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listAllSitesTool: Tool = {
  name: "list_all_sites",
  description:
    "List every site across ALL clients in the N-sight account. " +
    "Use this when the user asks for all sites, a full site list, or site count without specifying a particular client. " +
    "Handles the client → site traversal internally — no client ID needed. " +
    "Each record includes client name, client ID, site name, and site ID.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function listAllSites(
  client: NsightClient,
  _args: Record<string, never>
): Promise<string> {
  // Step 1: get all clients
  const clientsResult = await client.call({ service: "list_clients" });
  const rawClients = (clientsResult as any).client;
  const clients: any[] = Array.isArray(rawClients)
    ? rawClients
    : rawClients
    ? [rawClients]
    : [];

  if (clients.length === 0) {
    return JSON.stringify({ total_sites: 0, sites: [] }, null, 2);
  }

  // Step 2: get sites for all clients in parallel
  const siteResults = await Promise.all(
    clients.map(async (c) => {
      try {
        const result = await client.call({ service: "list_sites", clientid: Number(c.clientid) });
        const rawSites = (result as any).site;
        const sites: any[] = Array.isArray(rawSites) ? rawSites : rawSites ? [rawSites] : [];
        return sites.map((s: any) => ({
          client_id: Number(c.clientid),
          client_name: String(c.name),
          site_id: Number(s.siteid),
          site_name: String(s.name),
        }));
      } catch {
        return [];
      }
    })
  );

  const allSites = siteResults
    .flat()
    .sort((a, b) =>
      a.client_name.localeCompare(b.client_name) ||
      a.site_name.localeCompare(b.site_name)
    );

  return JSON.stringify(
    {
      total_clients: clients.length,
      total_sites: allSites.length,
      sites: allSites,
    },
    null,
    2
  );
}
