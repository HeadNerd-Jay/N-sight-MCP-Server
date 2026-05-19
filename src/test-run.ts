import dotenv from "dotenv";
import { NsightClient } from "./core/client.js";
import { listClients } from "./tools/readonly/list-clients.js";
import { listSites } from "./tools/readonly/list-sites.js";
import { listDevices } from "./tools/readonly/list-devices.js";
import { getDeviceAssets } from "./tools/readonly/get-device-assets.js";
import { listChecks } from "./tools/readonly/list-checks.js";
import { listPatches } from "./tools/readonly/list-patches.js";

dotenv.config();

const apiKey = process.env.NSIGHT_API_KEY;
const serverUrl = process.env.NSIGHT_SERVER_URL;

if (!apiKey || !serverUrl) {
  console.error("Error: NSIGHT_API_KEY or NSIGHT_SERVER_URL not found in .env file.");
  process.exit(1);
}

const nsightClient = new NsightClient({ apiKey, serverUrl });

async function runTests() {
  try {
    console.log("=== Testing: listClients ===");
    const clientsJson = await listClients(nsightClient, {});
    const clientsData = JSON.parse(clientsJson);
    console.log(`Found ${clientsData.total_clients || 0} clients.`);
    console.log(JSON.stringify(clientsData, null, 2));

    const firstClient = clientsData.clients?.[0];
    if (!firstClient) {
      console.log("No clients found, stopping test.");
      return;
    }

    const clientId = firstClient.client_id;
    console.log(`\n=== Testing: listSites for Client ID: ${clientId} ===`);
    const sitesJson = await listSites(nsightClient, { clientid: clientId });
    const sitesData = JSON.parse(sitesJson);
    console.log(`Found ${sitesData.total_sites || 0} sites.`);
    console.log(JSON.stringify(sitesData, null, 2));

    const firstSite = sitesData.sites?.[0];
    if (!firstSite) {
      console.log("No sites found, stopping test.");
      return;
    }

    const siteId = firstSite.site_id;
    console.log(`\n=== Testing: listDevices for Site ID: ${siteId} ===`);
    const devicesJson = await listDevices(nsightClient, { siteid: siteId });
    const devicesData = JSON.parse(devicesJson);
    console.log(`Found ${devicesData.total_devices || 0} devices.`);
    console.log(JSON.stringify(devicesData, null, 2));

    const firstDevice = devicesData.devices?.[0];
    if (!firstDevice) {
      console.log("No devices found, stopping test.");
      return;
    }

    const deviceId = firstDevice.device_id;
    const deviceType = firstDevice.device_type; // 'server' or 'workstation'

    console.log(`\n=== Testing: getDeviceAssets for Device ID: ${deviceId} ===`);
    const assetJson = await getDeviceAssets(nsightClient, {
      clientid: clientId,
      devicetype: deviceType,
      deviceid: deviceId,
    });
    console.log(JSON.stringify(JSON.parse(assetJson), null, 2));

    console.log(`\n=== Testing: listChecks for Device ID: ${deviceId} ===`);
    const checksJson = await listChecks(nsightClient, { deviceid: deviceId });
    console.log(JSON.stringify(JSON.parse(checksJson), null, 2));

    console.log(`\n=== Testing: listPatches for Device ID: ${deviceId} ===`);
    try {
      const patchesJson = await listPatches(nsightClient, { deviceid: deviceId });
      console.log(JSON.stringify(JSON.parse(patchesJson), null, 2));
    } catch (e: any) {
      console.log(`Patches failed or not configured for this device: ${e.message}`);
    }

  } catch (err: any) {
    console.error("Test execution encountered an error:", err.message);
  }
}

runTests();
