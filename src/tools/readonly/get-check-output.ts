/**
 * Tool: get_check_output  [READ-ONLY]
 * Maps to N-sight service: get_formatted_check_output
 * Docs: https://developer.n-able.com/n-sight/docs/getting-check-output
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const getCheckOutputTool: Tool = {
  name: "get_check_output",
  description:
    "Retrieve the raw/formatted output text and results of a specific monitoring check. " +
    "Useful for reading error messages, ping statistics, disk space details, or script log results.",
  inputSchema: {
    type: "object",
    properties: {
      checkid: {
        type: "number",
        description: "The unique identifier of the check (discoverable via list_checks).",
      },
    },
    required: ["checkid"],
  },
};

export async function getCheckOutput(
  client: NsightClient,
  args: { checkid: number }
): Promise<string> {
  const result = await client.call({
    service: "get_formatted_check_output",
    checkid: args.checkid,
  });

  const formattedOutput = (result as any).formatted_output;

  if (!formattedOutput) {
    return JSON.stringify({
      check_id: args.checkid,
      output: "No formatted output available for this check.",
    });
  }

  return JSON.stringify(
    {
      check_id: args.checkid,
      output: String(formattedOutput),
    },
    null,
    2
  );
}
