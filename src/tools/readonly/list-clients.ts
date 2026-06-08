/**
 * Tool: list_clients  [READ-ONLY]
 * Maps to N-sight service: list_clients
 * Docs: https://developer.n-able.com/n-sight/docs/listing-clients
 *
 * Foundation tool — returns all managed clients with their IDs.
 * Client IDs are required as input for most other N-sight MCP tools.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listClientsTool: Tool = {
  name: "list_clients",
  description:
    "List all managed clients (MSP customers) in the N-sight account. " +
    "Returns the client ID, name, and dashboard username for each client. " +
    "Use this tool first to discover client IDs — most other tools require a clientid as input. " +
    "Safe to call at any time; read-only, no side effects.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export interface NsightClient_ {
  clientid: string;
  name: string;
  dashboard_username?: string;
}

export async function listClients(
  client: NsightClient,
  _args: Record<string, never>
): Promise<string> {
  const result = await client.call({ service: "list_clients" });

  // N-sight returns a single object when there is one client, array when multiple
  const raw = (result as any).client;
  const clients: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (clients.length === 0) {
    return JSON.stringify({ total_clients: 0, clients: [] }, null, 2);
  }

  const formatted = clients.map((c) => ({
    client_id: Number(c.clientid),
    name: String(c.name),
    dashboard_username: c.dashboard_username ?? null,
  }));

  return JSON.stringify(
    {
      total_clients: formatted.length,
      clients: formatted,
    },
    null,
    2
  );
}
