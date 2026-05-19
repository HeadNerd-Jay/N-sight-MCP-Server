/**
 * Tool: get_device_assets  [READ-ONLY]
 * Maps to N-sight service: list_devices_at_client
 * Docs: https://developer.n-able.com/n-sight/docs/listing-devices-at-client
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const getDeviceAssetsTool: Tool = {
  name: "get_device_assets",
  description:
    "Retrieve detailed asset status, agent configuration, and active features (such as Patch, Managed Antivirus, Backup/MOB, and Web Protection) for a specific device. " +
    "Requires clientid, devicetype ('server' or 'workstation'), and deviceid.",
  inputSchema: {
    type: "object",
    properties: {
      clientid: {
        type: "number",
        description: "The client ID.",
      },
      devicetype: {
        type: "string",
        enum: ["server", "workstation"],
        description: "The device type.",
      },
      deviceid: {
        type: "number",
        description: "The unique identifier of the server or workstation.",
      },
    },
    required: ["clientid", "devicetype", "deviceid"],
  },
};

export async function getDeviceAssets(
  client: NsightClient,
  args: { clientid: number; devicetype: "server" | "workstation"; deviceid: number }
): Promise<string> {
  const { clientid, devicetype, deviceid } = args;

  const result = await client.call({
    service: "list_devices_at_client",
    clientid,
    devicetype,
  });

  const clientsRaw = (result as any).client;
  const clientsList = Array.isArray(clientsRaw)
    ? clientsRaw
    : clientsRaw
    ? [clientsRaw]
    : [];

  let foundDevice: any = null;
  let foundSiteName: string = "";
  let foundClientName: string = "";

  for (const c of clientsList) {
    const sitesRaw = c.site;
    const sitesList = Array.isArray(sitesRaw)
      ? sitesRaw
      : sitesRaw
      ? [sitesRaw]
      : [];

    for (const site of sitesList) {
      const devicesContainer = site;
      const deviceKey = devicetype; // 'server' or 'workstation' node name matches devicetype in XML
      const devicesRaw = devicesContainer[deviceKey];
      const devicesList = Array.isArray(devicesRaw)
        ? devicesRaw
        : devicesRaw
        ? [devicesRaw]
        : [];

      for (const d of devicesList) {
        if (Number(d.id) === deviceid) {
          foundDevice = d;
          foundSiteName = String(site.name);
          foundClientName = String(c.name);
          break;
        }
      }
      if (foundDevice) break;
    }
    if (foundDevice) break;
  }

  if (!foundDevice) {
    return `Device ID ${deviceid} of type ${devicetype} was not found under Client ID ${clientid}.`;
  }

  // Parse checkcount structure
  const cc = foundDevice.checkcount;
  const checkCounts = cc
    ? (Array.isArray(cc) ? cc : [cc]).map((item: any) => ({
        check_type:
          item.dsc_247 === "1"
            ? "24/7 Check"
            : item.dsc_247 === "2"
            ? "Daily Safety Check"
            : item.dsc_247 === "3"
            ? "Scheduled Task"
            : `Type ${item.dsc_247}`,
        pass: Number(item.pass ?? 0),
        fail: Number(item.fail ?? 0),
        clear: Number(item.clear ?? 0),
      }))
    : [];

  const deviceAsset = {
    device_id: Number(foundDevice.id),
    name: String(foundDevice.name),
    client_name: foundClientName,
    site_name: foundSiteName,
    device_type: devicetype,
    description: foundDevice.description ?? null,
    username: foundDevice.username ?? null,
    status: foundDevice.status ?? null,
    check_summary: checkCounts,
    features: {
      take_control_active: foundDevice.takecontrol === "1",
      patch_management_active: foundDevice.patch === "1",
      managed_antivirus_active: foundDevice.mav === "1" || foundDevice.mavbreck === "1",
      managed_antivirus_engine: foundDevice.mavbreck === "1" ? "Bitdefender" : foundDevice.mav === "1" ? "Vipre" : "None",
      backup_active: foundDevice.mob === "1",
      systray_active: foundDevice.systray === "1",
      web_protection_active: foundDevice.webprotection === "1",
      risk_intelligence_active: foundDevice.riskintelligence === "1",
    },
  };

  return JSON.stringify(deviceAsset, null, 2);
}
