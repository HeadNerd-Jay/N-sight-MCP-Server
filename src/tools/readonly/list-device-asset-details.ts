import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient, NsightRequestParams } from "../../core/client.js";

export const listDeviceAssetDetailsTool: Tool = {
  name: "list_device_asset_details",
  description:
    "Lists complete hardware, software, network, chassis, role, RAM, custom assets, serial number, and product keys for a single specific device. " +
    "SINGLE DEVICE ONLY. Do NOT call this tool in a loop, batch, or sequence across multiple devices. " +
    "If the user asks for asset details across more than one device or an entire customer, do NOT iterate — " +
    "instead respond: 'I can only retrieve asset details for one device at a time. Which specific device would you like me to check?' " +
    "Only call this tool when the user has explicitly named one specific device. " +
    "You MUST provide device_name before calling — resolve it via list_devices first.",
  inputSchema: {
    type: "object",
    properties: {
      device_name: {
        type: "string",
        description: "The name of the device (e.g. 'CSP-0009'). Must be resolved via list_devices before calling this tool.",
      },
      deviceid: {
        type: "number",
        description: "The device ID to retrieve detailed asset specs for (retrieved via list_devices).",
      },
    },
    required: ["device_name", "deviceid"],
  },
};

export async function listDeviceAssetDetails(
  client: NsightClient,
  args: { device_name: string; deviceid: number }
): Promise<string> {
  const { device_name, deviceid } = args;

  if (!device_name?.trim()) {
    return "Error: device_name is required. Resolve the device name via list_devices before calling list_device_asset_details.";
  }

  const params: NsightRequestParams = {
    service: "list_device_asset_details",
    deviceid,
  };

  const result = await client.call(params) as any;

  if (!result) {
    return `No asset details found for device "${device_name}" (device ID ${deviceid}).`;
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
    device_name,
    device_id: deviceid,
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
