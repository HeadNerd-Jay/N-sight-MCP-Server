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
    "List hardware inventory details (processors, memory, BIOS, storage, network, etc.) for a single specific device. " +
    "SINGLE DEVICE ONLY. Do NOT call this tool in a loop, batch, or sequence across multiple devices. " +
    "If the user asks for hardware across more than one device or an entire customer, do NOT iterate — " +
    "instead respond: 'I can only retrieve hardware details for one device at a time. Which specific device would you like me to check?' " +
    "Only call this tool when the user has explicitly named one specific device. " +
    "You MUST provide device_name before calling — resolve it via list_devices first. " +
    "Requires an assetid (retrieved via list_devices or get_device_assets).",
  inputSchema: {
    type: "object",
    properties: {
      device_name: {
        type: "string",
        description: "The name of the device (e.g. 'CSP-0009'). Must be resolved via list_devices before calling this tool.",
      },
      assetid: {
        type: "number",
        description: "The unique physical asset ID of the device (retrieved via list_devices or get_device_assets).",
      },
    },
    required: ["device_name", "assetid"],
  },
};

export async function listHardware(
  client: NsightClient,
  args: { device_name: string; assetid: number }
): Promise<string> {
  const { device_name, assetid } = args;

  if (!device_name?.trim()) {
    return "Error: device_name is required. Resolve the device name via list_devices before calling list_hardware.";
  }

  const result = await client.call({
    service: "list_all_hardware",
    assetid,
  });

  const raw = (result as any).hardware;
  const hardwareList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (hardwareList.length === 0) {
    return `No hardware inventory found for device "${device_name}" (asset ID ${assetid}).`;
  }

  const formatted = hardwareList.map((h) => ({
    name: String(h.name ?? ""),
    manufacturer: String(h.manufacturer ?? ""),
    type: String(h.typeLabel ?? h.type ?? "Unknown Type"),
    details: String(h.details ?? ""),
  }));

  return JSON.stringify(
    {
      device_name,
      asset_id: assetid,
      total_items: formatted.length,
      hardware: formatted,
    },
    null,
    2
  );
}
