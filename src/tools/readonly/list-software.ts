/**
 * Tool: list_software  [READ-ONLY]
 * Maps to N-sight service: list_all_software
 * Docs: https://developer.n-able.com/n-sight/docs/listing-device-software
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listSoftwareTool: Tool = {
  name: "list_software",
  description:
    "List installed software registry details (name, version, vendor, install date) for a specific asset ID. " +
    "Requires an assetid (retrieved via list_devices or get_device_assets).",
  inputSchema: {
    type: "object",
    properties: {
      assetid: {
        type: "number",
        description: "The unique physical asset ID of the device.",
      },
    },
    required: ["assetid"],
  },
};

export async function listSoftware(
  client: NsightClient,
  args: { assetid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_all_software",
    assetid: args.assetid,
  });

  const raw = (result as any).software;
  const softwareList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (softwareList.length === 0) {
    return `No installed software found for asset ID ${args.assetid}.`;
  }

  const formatted = softwareList.map((s) => ({
    name: String(s.name ?? ""),
    version: String(s.version ?? ""),
    vendor: String(s.vendor ?? ""),
    install_date: s.installdate ?? null,
  }));

  return JSON.stringify(
    {
      asset_id: args.assetid,
      total_items: formatted.length,
      software: formatted,
    },
    null,
    2
  );
}
