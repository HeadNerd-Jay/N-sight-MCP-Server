/**
 * Tool: add_site  [PRODUCTION ONLY]
 * Maps to N-sight service: add_site
 * Docs: https://developer.n-able.com/n-sight/docs/add-site
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const addSiteTool: Tool = {
  name: "add_site",
  description:
    "Create a new site under an existing client in N-sight. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      client_id: { type: "number", description: "The client ID to add the site under. Obtain from list_clients." },
      name: { type: "string", description: "The display name for the new site." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["client_id", "name", "confirm"],
  },
};

export async function addSite(
  client: NsightClient,
  audit: AuditLogger,
  args: { client_id: number; name: string; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `add_site: confirmation required — site "${args.name}" under client ID ${args.client_id} not created.`);
    return JSON.stringify({
      action: "add_site",
      status: "pending_confirmation",
      client_id: args.client_id,
      name: args.name,
      message: "Action not confirmed. Set confirm: true to create this site.",
    }, null, 2);
  }

  await ctx?.log("info", `add_site: writing audit log for new site "${args.name}" under client ID ${args.client_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "add_site", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `add_site: calling N-sight API to create site "${args.name}"...`);
  await ctx?.progress(2, 3);
  const result = await client.call({ service: "add_site", clientid: args.client_id, name: args.name }) as any;
  const newSiteId = result?.siteid ?? result?.site?.siteid ?? null;

  await ctx?.progress(3, 3);
  await ctx?.log("info", `add_site: site "${args.name}" created${newSiteId ? ` with ID ${newSiteId}` : ""} under client ID ${args.client_id}.`);

  return JSON.stringify({
    action: "add_site",
    status: "success",
    site_id: newSiteId ? Number(newSiteId) : null,
    client_id: args.client_id,
    name: args.name,
    message: "Site created successfully. Use list_sites to verify.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
