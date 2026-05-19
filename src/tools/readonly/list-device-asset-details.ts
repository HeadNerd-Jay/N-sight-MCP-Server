import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient, NsightRequestParams } from "../../core/client.js";

export const listDeviceAssetDetailsTool: Tool = {
  name: "list_device_asset_details",
  description:
    "Lists complete hardware, software, network, chassis, role, RAM, custom assets, serial number, and product keys for a specific device.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "Required. The device ID to retrieve detailed asset specs for.",
      },
    },
    required: ["deviceid"],
  },
};

export async function listDeviceAssetDetails(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const params: NsightRequestParams = {
    service: "list_device_asset_details",
    deviceid: args.deviceid,
  };

  const result = await client.call(params) as any;
  
  if (!result) {
    return `No asset details found for device ID ${args.deviceid}.`;
  }

  const parseItem = (item: any) => {
    if (!item) return null;
    return {
      name: item.name ? String(item.name) : undefined,
      hardware_id: item.hardwareid ? Number(item.hardwareid) : undefined,
      software_id: item.softwareid ? Number(item.softwareid) : undefined,
      asset_id: item.assetid ? Number(item.assetid) : undefined,
      manufacturer: item.manufacturer ? String(item.manufacturer) : undefined,
      version: item.version ? String(item.version) : undefined,
      install_date: item.install_date ? String(item.install_date) : undefined,
      details: item.details ? String(item.details).trim() : undefined,
      type: item.type ? String(item.type) : undefined,
      status: item.status ? String(item.status) : undefined,
      deleted: item.deleted !== undefined ? Number(item.deleted) === 1 : undefined,
      modified: item.modified !== undefined ? Number(item.modified) === 1 : undefined,
    };
  };

  const hardwareRaw = result.hardware?.item;
  const hardware = Array.isArray(hardwareRaw) 
    ? hardwareRaw.map(parseItem) 
    : hardwareRaw 
      ? [parseItem(hardwareRaw)] 
      : [];

  const softwareRaw = result.software?.item;
  const software = Array.isArray(softwareRaw) 
    ? softwareRaw.map(parseItem) 
    : softwareRaw 
      ? [parseItem(softwareRaw)] 
      : [];

  // Parse custom fields (up to custom10)
  const customFields: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    const key = `custom${i}`;
    const field = result[key];
    if (field && field.$ && field.$.customname) {
      customFields[field.$.customname] = field._ || "";
    }
  }

  const details = {
    device_id: args.deviceid,
    client: result.client ? String(result.client) : undefined,
    chassis_type: result.chassistype ? String(result.chassistype) : undefined,
    ip_address: result.ip ? String(result.ip) : undefined,
    mac_addresses: [result.mac1, result.mac2, result.mac3].filter(Boolean).map(String),
    user: result.user ? String(result.user) : undefined,
    manufacturer: result.manufacturer ? String(result.manufacturer) : undefined,
    model: result.model ? String(result.model) : undefined,
    operating_system: result.os ? String(result.os) : undefined,
    serial_number: result.serialnumber ? String(result.serialnumber) : undefined,
    product_key: result.productkey ? String(result.productkey) : undefined,
    role: result.role !== undefined ? Number(result.role) : undefined,
    service_pack: result.servicepack ? String(result.servicepack) : undefined,
    ram_bytes: result.ram !== undefined ? Number(result.ram) : undefined,
    scan_time: result.scantime ? String(result.scantime) : undefined,
    custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
    hardware_items_count: hardware.length,
    software_items_count: software.length,
    hardware,
    software
  };

  return JSON.stringify(details, null, 2);
}
