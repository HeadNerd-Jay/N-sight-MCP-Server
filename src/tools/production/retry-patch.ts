/**
 * Tool: retry_patch  [PRODUCTION ONLY]
 * Maps to N-sight service: retry_patch
 * Docs: https://developer.n-able.com/n-sight/docs/retry-patch
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const retryPatchTool: Tool = {
  name: "retry_patch",
  description:
    "Retry a failed patch installation on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      patch_id: { type: "number", description: "The patch ID to retry. Obtain from list_patches." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "patch_id", "confirm"],
  },
};

export async function retryPatch(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; patch_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `retry_patch: confirmation required — patch ID ${args.patch_id} not retried.`);
    return JSON.stringify({
      action: "retry_patch",
      status: "pending_confirmation",
      device_id: args.device_id,
      patch_id: args.patch_id,
      message: "Action not confirmed. Set confirm: true to retry this patch.",
    }, null, 2);
  }

  await ctx?.log("info", `retry_patch: writing audit log for patch ID ${args.patch_id} on device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "retry_patch", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `retry_patch: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "retry_patch", deviceid: args.device_id, patchid: args.patch_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `retry_patch: patch ID ${args.patch_id} queued for retry.`);

  return JSON.stringify({
    action: "retry_patch",
    status: "success",
    device_id: args.device_id,
    patch_id: args.patch_id,
    message: "Patch queued for retry. Check list_patches to confirm the new status.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
