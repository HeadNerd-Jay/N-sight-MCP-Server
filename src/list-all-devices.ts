import dotenv from "dotenv";
import { NsightClient } from "./core/client.js";
import { listClients } from "./tools/readonly/list-clients.js";
import { listSites } from "./tools/readonly/list-sites.js";
import { listDevices } from "./tools/readonly/list-devices.js";

dotenv.config();

const apiKey = process.env.NSIGHT_API_KEY;
const serverUrl = process.env.NSIGHT_SERVER_URL;

if (!apiKey || !serverUrl) {
  console.error("Error: NSIGHT_API_KEY or NSIGHT_SERVER_URL not found in .env file.");
  process.exit(1);
}

const nsightClient = new NsightClient({ apiKey, serverUrl });

async function listAllDevices() {
  try {
    console.log("Fetching all clients...");
    const clientsJson = await listClients(nsightClient, {});
    const clientsData = JSON.parse(clientsJson);
    const clients = clientsData.clients || [];

    console.log(`Found ${clients.length} clients.`);

    const report: any[] = [];

    for (const client of clients) {
      console.log(`\nFetching sites for client: ${client.name} (ID: ${client.client_id})...`);
      const sitesJson = await listSites(nsightClient, { clientid: client.client_id });
      let sites: any[] = [];
      try {
        const sitesData = JSON.parse(sitesJson);
        sites = sitesData.sites || [];
      } catch {
        // No sites found or plain text response
      }

      for (const site of sites) {
        console.log(`  Fetching devices for site: ${site.name} (ID: ${site.site_id})...`);
        const devicesJson = await listDevices(nsightClient, { siteid: site.site_id });
        let devices: any[] = [];
        try {
          const devicesData = JSON.parse(devicesJson);
          devices = devicesData.devices || [];
        } catch {
          // If return is a plain string because no devices were found
          devices = [];
        }

        if (devices.length > 0) {
          report.push({
            client_name: client.name,
            client_id: client.client_id,
            site_name: site.name,
            site_id: site.site_id,
            devices: devices.map((d: any) => ({
              device_id: d.device_id,
              name: d.name,
              type: d.device_type,
              os: d.operating_system,
              ip: d.ip_address,
              status: d.status,
            })),
          });
        }
      }
    }

    console.log("\n==================================================");
    console.log("FINAL REPORT: ALL DEVICES ACROSS CLIENTS & SITES");
    console.log("==================================================");
    console.log(JSON.stringify(report, null, 2));

  } catch (err: any) {
    console.error("Error generating report:", err.message);
  }
}

listAllDevices();
