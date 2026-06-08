/**
 * Tool: ignore_patch  [PRODUCTION ONLY]
 * Maps to N-sight service: ignore_patch
 * Docs: https://developer.n-able.com/n-sight/docs/ignore-patch
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const ignorePatchTool: Tool = {
  name: "ignore_patch",
  description:
    "Mark a patch as ignored so it will not be flagged for installation on a device. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      device_id: { type: "number", description: "The device ID. Obtain from list_devices." },
      patch_id: { type: "number", description: "The patch ID to ignore. Obtain from list_patches." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["device_id", "patch_id", "confirm"],
  },
};

export async function ignorePatch(
  client: NsightClient,
  audit: AuditLogger,
  args: { device_id: number; patch_id: number; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `ignore_patch: confirmation required — patch ID ${args.patch_id} not ignored.`);
    return JSON.stringify({
      action: "ignore_patch",
      status: "pending_confirmation",
      device_id: args.device_id,
      patch_id: args.patch_id,
      message: "Action not confirmed. Set confirm: true to ignore this patch.",
    }, null, 2);
  }

  await ctx?.log("info", `ignore_patch: writing audit log for patch ID ${args.patch_id} on device ID ${args.device_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "ignore_patch", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `ignore_patch: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "ignore_patch", deviceid: args.device_id, patchid: args.patch_id });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `ignore_patch: patch ID ${args.patch_id} marked as ignored.`);

  return JSON.stringify({
    action: "ignore_patch",
    status: "success",
    device_id: args.device_id,
    patch_id: args.patch_id,
    message: "Patch marked as ignored. It will no longer be flagged for this device.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
