/**
 * Tool: list_hardware  [READ-ONLY]
 * Maps to N-sight service: list_all_hardware
 * Docs: https://developer.n-able.com/n-sight/docs/listing-device-hardware
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listHardwareTool: Tool = {
  name: "list_hardware",
  description:
    "List hardware inventory details (processors, memory, BIOS, storage, network, etc.) for a specific asset ID. " +
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

export async function listHardware(
  client: NsightClient,
  args: { assetid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_all_hardware",
    assetid: args.assetid,
  });

  const raw = (result as any).hardware;
  const hardwareList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (hardwareList.length === 0) {
    return `No hardware inventory found for asset ID ${args.assetid}.`;
  }

  const formatted = hardwareList.map((h) => ({
    name: String(h.name ?? ""),
    manufacturer: String(h.manufacturer ?? ""),
    type: String(h.typeLabel ?? h.type ?? "Unknown Type"),
    details: String(h.details ?? ""),
  }));

  return JSON.stringify(
    {
      asset_id: args.assetid,
      total_items: formatted.length,
      hardware: formatted,
    },
    null,
    2
  );
}
