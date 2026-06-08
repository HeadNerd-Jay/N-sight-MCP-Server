/**
 * Tool: add_check_note  [PRODUCTION ONLY]
 * Maps to N-sight service: add_check_note
 * Docs: https://developer.n-able.com/n-sight/docs/add-check-note
 *
 * ⚠️ WRITE OPERATION — requires confirm: true before executing.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";
import { AuditLogger } from "../../core/audit.js";
import { McpContext } from "../../core/mcp-context.js";

export const addCheckNoteTool: Tool = {
  name: "add_check_note",
  description:
    "Add a note to a check on a device. Useful for documenting investigation steps or acknowledging known issues. " +
    "⚠️ Write action — you will be asked to confirm before it executes.",
  inputSchema: {
    type: "object",
    properties: {
      check_id: { type: "number", description: "The check ID to annotate. Obtain from list_checks or list_failing_checks." },
      note: { type: "string", description: "The note text to add to the check." },
      confirm: { type: "boolean", description: "Must be true to execute." },
    },
    required: ["check_id", "note", "confirm"],
  },
};

export async function addCheckNote(
  client: NsightClient,
  audit: AuditLogger,
  args: { check_id: number; note: string; confirm: boolean },
  ctx?: McpContext,
  operatorId?: string
): Promise<string> {
  if (!args.confirm) {
    await ctx?.log("info", `add_check_note: confirmation required — check ID ${args.check_id} not updated.`);
    return JSON.stringify({
      action: "add_check_note",
      status: "pending_confirmation",
      check_id: args.check_id,
      note_preview: args.note.length > 80 ? args.note.slice(0, 80) + "…" : args.note,
      message: "Action not confirmed. Set confirm: true to add this note.",
    }, null, 2);
  }

  await ctx?.log("info", `add_check_note: writing audit log for check ID ${args.check_id}...`);
  await ctx?.progress(1, 3);
  await audit.log({ action: "add_check_note", operator: operatorId ?? "unknown", params: args });

  await ctx?.log("info", `add_check_note: calling N-sight API...`);
  await ctx?.progress(2, 3);
  await client.call({ service: "add_check_note", checkid: args.check_id, note: args.note });

  await ctx?.progress(3, 3);
  await ctx?.log("info", `add_check_note: note added to check ID ${args.check_id}.`);

  return JSON.stringify({
    action: "add_check_note",
    status: "success",
    check_id: args.check_id,
    note: args.note,
    message: "Note added to check successfully.",
    timestamp: new Date().toISOString(),
  }, null, 2);
}
