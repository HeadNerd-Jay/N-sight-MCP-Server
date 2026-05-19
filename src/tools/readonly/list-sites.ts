/**
 * Tool: list_sites  [READ-ONLY]
 * Maps to N-sight service: list_sites
 * Docs: https://developer.n-able.com/n-sight/docs/listing-sites
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listSitesTool: Tool = {
  name: "list_sites",
  description:
    "List all sites associated with a specific client ID. " +
    "Returns the site ID and site name. " +
    "Use this tool to find site IDs needed for device listing.",
  inputSchema: {
    type: "object",
    properties: {
      clientid: {
        type: "number",
        description: "The N-sight client ID (discoverable via list_clients).",
      },
    },
    required: ["clientid"],
  },
};

export interface NsightSite_ {
  siteid: string;
  name: string;
}

export async function listSites(
  client: NsightClient,
  args: { clientid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_sites",
    clientid: args.clientid,
  });

  // N-sight returns a single object when there is one site, array when multiple
  const raw = (result as any).site;
  const sites: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (sites.length === 0) {
    return `No sites found for client ID ${args.clientid}.`;
  }

  const formatted = sites.map((s) => ({
    site_id: Number(s.siteid),
    name: String(s.name),
  }));

  return JSON.stringify(
    {
      total_sites: formatted.length,
      sites: formatted,
    },
    null,
    2
  );
}
