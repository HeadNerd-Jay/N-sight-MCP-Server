/**
 * Tool: list_devices  [READ-ONLY]
 * Maps to N-sight services: list_servers + list_workstations
 * Docs:
 *   - Servers: https://developer.n-able.com/n-sight/docs/listing-servers
 *   - Workstations: https://developer.n-able.com/n-sight/docs/listing-workstations
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listDevicesTool: Tool = {
  name: "list_devices",
  description:
    "List all monitoring devices (servers and workstations) at a specific site. " +
    "Returns device ID, name, online status, IP address, OS details, and physical asset ID (assetid). " +
    "Unified interface for both servers and workstations.",
  inputSchema: {
    type: "object",
    properties: {
      siteid: {
        type: "number",
        description: "The N-sight site ID (discoverable via list_sites).",
      },
    },
    required: ["siteid"],
  },
};

export async function listDevices(
  client: NsightClient,
  args: { siteid: number }
): Promise<string> {
  const { siteid } = args;

  // Query both list_servers and list_workstations in parallel
  const [serversResult, workstationsResult] = await Promise.all([
    client.call({ service: "list_servers", siteid }).catch(() => ({})),
    client.call({ service: "list_workstations", siteid }).catch(() => ({})),
  ]);

  const rawServers = (serversResult as any).server;
  const serversList: any[] = Array.isArray(rawServers)
    ? rawServers
    : rawServers
    ? [rawServers]
    : [];

  const rawWorkstations = (workstationsResult as any).workstation;
  const workstationsList: any[] = Array.isArray(rawWorkstations)
    ? rawWorkstations
    : rawWorkstations
    ? [rawWorkstations]
    : [];

  const devices: any[] = [];

  // Map servers
  for (const s of serversList) {
    devices.push({
      device_id: Number(s.serverid),
      device_type: "server",
      name: String(s.name),
      description: s.description ?? null,
      agent_version: s.agent_version ?? null,
      install_date: s.install_date ?? null,
      last_boot_time: s.last_boot_time ? Number(s.last_boot_time) : null,
      online: s.online === "1" || s.online === 1,
      asset_id: s.assetid ? Number(s.assetid) : null,
      manufacturer: s.manufacturer ?? null,
      model: s.model ?? null,
      serial_number: s.serialnumber ?? null,
      ip_address: s.ipaddress ?? null,
      os_version: s.osversion ?? null,
      os_description: s.osdesc ?? null,
    });
  }

  // Map workstations
  for (const w of workstationsList) {
    devices.push({
      device_id: Number(w.workstationid),
      device_type: "workstation",
      name: String(w.name),
      description: w.description ?? null,
      agent_version: w.agent_version ?? null,
      install_date: w.install_date ?? null,
      last_boot_time: w.last_boot_time ? Number(w.last_boot_time) : null,
      online: w.online === "1" || w.online === 1,
      asset_id: w.assetid ? Number(w.assetid) : null,
      manufacturer: w.manufacturer ?? null,
      model: w.model ?? null,
      serial_number: w.serialnumber ?? null,
      ip_address: w.ipaddress ?? null,
      os_version: w.osversion ?? null,
      os_description: w.osdesc ?? null,
    });
  }

  if (devices.length === 0) {
    return `No servers or workstations found for site ID ${siteid}.`;
  }

  return JSON.stringify(
    {
      total_devices: devices.length,
      devices,
    },
    null,
    2
  );
}
