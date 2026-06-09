/**
 * Tool: get_environment_summary  [READ-ONLY]
 * Scoped health and inventory snapshot for a single customer, optionally
 * filtered to one or more named sites within that customer.
 *
 * Scope rules (enforced at runtime):
 *   - At least one of client_name or site_names must be provided.
 *   - Only one customer is permitted per call — multi-customer calls are rejected.
 *   - Multiple sites within a single customer are allowed via site_names array.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const getEnvironmentSummaryTool: Tool = {
  name: "get_environment_summary",
  description:
    "Return a health and inventory snapshot for a specific customer (client), " +
    "optionally scoped to one or more named sites within that customer. " +
    "Includes: total sites, total devices (online vs offline), failing checks, and a per-site breakdown. " +
    "Use this for customer health overviews, site briefings, or any time the user asks about the state of a specific customer or site. " +
    "IMPORTANT CONSTRAINTS: " +
    "(1) You MUST provide at least one of client_name or site_names — do not call without scoping context. " +
    "(2) Only ONE customer is permitted per call — multi-customer requests will be rejected. " +
    "(3) Multiple sites for the same customer are allowed via the site_names array. " +
    "Resolve customer and site names via list_clients and list_sites first if needed.",
  inputSchema: {
    type: "object",
    properties: {
      client_name: {
        type: "string",
        description: "The name of the customer to summarise (e.g. 'Kelltic Cider Company'). Only one customer allowed per call. Resolve via list_clients.",
      },
      site_names: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of site names to scope the summary to (e.g. ['Cork', 'Dublin']). Must all belong to the same customer. Multiple sites for one customer are allowed.",
      },
    },
    required: [],
  },
};

export async function getEnvironmentSummary(
  client: NsightClient,
  args: { client_name?: string; site_names?: string[] }
): Promise<string> {
  const { client_name, site_names } = args;

  // Enforce: at least one scoping parameter required
  if (!client_name && (!site_names || site_names.length === 0)) {
    return "Error: You must provide at least one of client_name or site_names. " +
      "This tool is scoped to a single customer — use list_clients or list_sites to resolve names first.";
  }

  // Step 1: fetch all clients to resolve name to ID
  const clientsResult = await client.call({ service: "list_clients" });
  const rawClients = (clientsResult as any).client;
  const allClients: any[] = Array.isArray(rawClients)
    ? rawClients
    : rawClients
    ? [rawClients]
    : [];

  // Step 2: filter to the requested customer
  let matchedClients = allClients;
  if (client_name) {
    matchedClients = allClients.filter(
      (c) => String(c.name).toLowerCase() === client_name.toLowerCase()
    );
    if (matchedClients.length === 0) {
      return `Error: No customer found with the name "${client_name}". Use list_clients to see available customers.`;
    }
  }

  // Enforce: only one customer allowed per call
  if (matchedClients.length > 1) {
    const names = matchedClients.map((c: any) => String(c.name)).join(", ");
    return `Error: This tool only supports one customer per call, but the request matched multiple: ${names}. ` +
      "Please specify a single client_name to narrow the scope.";
  }

  const matchedClient = matchedClients[0];
  const clientId = Number(matchedClient.clientid);
  const resolvedClientName = String(matchedClient.name);

  // Step 3: fetch sites for this customer
  const sitesResult = await client.call({ service: "list_sites", clientid: clientId }).catch(() => ({}));
  const rawSites = (sitesResult as any).site;
  let sites: any[] = Array.isArray(rawSites) ? rawSites : rawSites ? [rawSites] : [];

  // Step 4: if site_names provided, filter and validate they all belong to this customer
  if (site_names && site_names.length > 0) {
    const lowerRequested = site_names.map((s) => s.toLowerCase());
    const matched = sites.filter((s: any) =>
      lowerRequested.includes(String(s.name).toLowerCase())
    );
    const matchedNames = matched.map((s: any) => String(s.name).toLowerCase());
    const unmatched = site_names.filter((s) => !matchedNames.includes(s.toLowerCase()));
    if (unmatched.length > 0) {
      return `Error: The following sites were not found under customer "${resolvedClientName}": ${unmatched.join(", ")}. ` +
        "Use list_sites to see available sites for this customer.";
    }
    sites = matched;
  }

  // Step 5: get failing checks for this client
  const failingChecksResult = await client.call({ service: "list_failing_checks", clientid: clientId }).catch(() => ({}));
  const rawChecks = (failingChecksResult as any).check;
  const failingChecks: any[] = Array.isArray(rawChecks)
    ? rawChecks
    : rawChecks
    ? [rawChecks]
    : [];

  // Step 6: get device counts for all matched sites in parallel
  const siteSummaries: any[] = [];

  await Promise.all(
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
        const rawWS = (workstationsResult as any).workstation;
        const workstations: any[] = Array.isArray(rawWS) ? rawWS : rawWS ? [rawWS] : [];

        const allDevices = [...servers, ...workstations];
        const online = allDevices.filter((d) => d.online === "1" || d.online === 1).length;
        const offline = allDevices.length - online;
        const siteFailingChecks = failingChecks.filter(
          (c: any) => Number(c.siteid ?? c.site_id ?? 0) === siteId
        ).length;

        siteSummaries.push({
          site_id: siteId,
          site_name: siteName,
          devices: allDevices.length,
          online,
          offline,
          failing_checks: siteFailingChecks,
          health: siteFailingChecks === 0 && offline === 0 ? "healthy" : "attention_needed",
        });
      } catch {
        siteSummaries.push({
          site_id: siteId,
          site_name: siteName,
          devices: 0,
          online: 0,
          offline: 0,
          failing_checks: 0,
          health: "unknown",
        });
      }
    })
  );

  siteSummaries.sort((a, b) => b.failing_checks - a.failing_checks || a.site_name.localeCompare(b.site_name));

  const totalDevices = siteSummaries.reduce((s, x) => s + x.devices, 0);
  const totalOnline = siteSummaries.reduce((s, x) => s + x.online, 0);

  return JSON.stringify(
    {
      client_id: clientId,
      client_name: resolvedClientName,
      total_sites: siteSummaries.length,
      total_devices: totalDevices,
      online_devices: totalOnline,
      offline_devices: totalDevices - totalOnline,
      total_failing_checks: failingChecks.length,
      sites_needing_attention: siteSummaries.filter((s) => s.health === "attention_needed").length,
      sites: siteSummaries,
    },
    null,
    2
  );
}
