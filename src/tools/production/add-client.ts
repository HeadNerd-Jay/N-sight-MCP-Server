/**
 * Tool: add_client  [PRODUCTION ONLY]
 * Maps to N-sight service: add_client
 * Docs: https://developer.n-able.com/n-sight/docs/add-client
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";

export const addClientTool: Tool = {
  name: "add_client",
  description:
    "Create a new managed client (MSP customer) in N-sight. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The display name for the new client." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["name", "confirm"],
  },
};

export async function addClient(
  client: NsightClient,
  audit: AuditLogger,
  args: { name: string; confirm: boolean },
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    return JSON.stringify({
      action: "add_client",
      status: "pending_confirmation",
      name: args.name,
      message: "Action not confirmed. Set confirm: true to create this client.",
    }, null, 2);
  }

  await audit.log({ action: "add_client", operator: operatorId ?? "unknown", params: args });
  const result = await client.call({ service: "add_client", name: args.name }) as any;
  const newClientId = result?.clientid ?? result?.client?.clientid ?? null;

  return JSON.stringify({
    action: "add_client",
    status: "success",
    client_id: newClientId ? Number(newClientId) : null,
    name: args.name,
    message: "Client created successfully. Use list_clients to verify.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
