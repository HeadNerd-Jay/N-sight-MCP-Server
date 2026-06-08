/**
 * Tool: approve_patch  [PRODUCTION ONLY]
 * Maps to N-sight service: approve_patch
 * Docs: https://developer.n-able.com/n-sight/docs/approve-patch
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const approvePatchTool: Tool = {
  name: "approve_patch",
  description:
    "Approve a pending patch for installation on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      patch_id: { type: "number", description: "The patch ID to approve. Obtain from list_patches." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "patch_id", "confirm"],
  },
};

export async function approvePatch(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; patch_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `approve_patch: confirmation required — patch ID ${args.patch_id} not approved.`);
    return JSON.stringify({
      action: "approve_patch",
      status: "pending_confirmation",
      device_id: args.device_id,
      patch_id: args.patch_id,
      message: "Action not confirmed. Set confirm: true to approve this patch.",
    }, null, 2);
  }

  await ctx?.log("info", `approve_patch: writing audit log for patch ID ${args.patch_id} on device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "approve_patch", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `approve_patch: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "approve_patch", deviceid: args.device_id, patchid: args.patch_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `approve_patch: patch ID ${args.patch_id} approved for installation.`);

  return JSON.stringify({
    action: "approve_patch",
    status: "success",
    device_id: args.device_id,
    patch_id: args.patch_id,
    message: "Patch approved for installation.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
