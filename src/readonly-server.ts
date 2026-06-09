/**
 * N-sight MCP Read-Only Server
 *
 * Exposes safe, read-only tools for N-sight RMM to any MCP-compatible AI client
 * (Claude Desktop, Microsoft Copilot Studio, etc.).
 *
 * Transport: stdio (standard input/output)
 * Auth:      N-sight API key via environment variable
 *
 * Usage:
 *   npm run dev:readonly     (development, via tsx)
 *   npm run start:readonly   (production, from compiled dist/)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

import { NsightClient } from "./core/client.js";
import { McpContext } from "./core/mcp-context.js";
import { SessionGuard } from "./core/session-guard.js";
import { listClientsTool, listClients } from "./tools/readonly/list-clients.js";
// list-all-devices deprecated — too broad, no client/site scoping, risk of rate limit exhaustion on large accounts
import { listAllSitesTool, listAllSites } from "./tools/readonly/list-all-sites.js";
import { getEnvironmentSummaryTool, getEnvironmentSummary } from "./tools/readonly/get-environment-summary.js";
import { listFailingChecksTool, listFailingChecks } from "./tools/readonly/list-failing-checks.js";
import { listSitesTool, listSites } from "./tools/readonly/list-sites.js";
import { listDevicesTool, listDevices } from "./tools/readonly/list-devices.js";
import { getDeviceAssetsTool, getDeviceAssets } from "./tools/readonly/get-device-assets.js";
import { listChecksTool, listChecks } from "./tools/readonly/list-checks.js";
import { listOutagesTool, listOutages } from "./tools/readonly/list-outages.js";
import { getCheckOutputTool, getCheckOutput } from "./tools/readonly/get-check-output.js";
import { listADUsersTool, listADUsers } from "./tools/readonly/list-ad-users.js";
import { listPatchesTool, listPatches } from "./tools/readonly/list-patches.js";
import { listAVThreatsTool, listAVThreats } from "./tools/readonly/list-av-threats.js";
import { listAVScansTool, listAVScans } from "./tools/readonly/list-av-scans.js";
import { listAVQuarantineTool, listAVQuarantine } from "./tools/readonly/list-av-quarantine.js";
import { listHardwareTool, listHardware } from "./tools/readonly/list-hardware.js";
import { listSoftwareTool, listSoftware } from "./tools/readonly/list-software.js";
import { listBackupSessionsTool, listBackupSessions } from "./tools/readonly/list-backup-sessions.js";
import { listBackupHistoryTool, listBackupHistory } from "./tools/readonly/list-backup-history.js";
import { listDriveHistoryTool, listDriveHistory } from "./tools/readonly/list-drive-history.js";
import { listPerformanceHistoryTool, listPerformanceHistory } from "./tools/readonly/list-performance-history.js";
import { listClientLicenseCountTool, listClientLicenseCount } from "./tools/readonly/list-client-license-count.js";
import { listDeviceAssetDetailsTool, listDeviceAssetDetails } from "./tools/readonly/list-device-asset-details.js";

// Load .env from the project root relative to this file (dist/../.env)
// This works regardless of the working directory Claude Desktop uses when launching.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

// ---------------------------------------------------------------------------
// Validate required environment variables
// ---------------------------------------------------------------------------
const { NSIGHT_API_KEY, NSIGHT_SERVER_URL } = process.env;

if (!NSIGHT_API_KEY || !NSIGHT_SERVER_URL) {
  console.error(
    "Error: NSIGHT_API_KEY and NSIGHT_SERVER_URL must be set.\n" +
    "Copy .env.example to .env and fill in your values."
  );
  process.exit(1);
}

// Validate NSIGHT_SERVER_URL is a well-formed HTTPS URL (SSRF guard)
try {
  const parsedUrl = new URL(NSIGHT_SERVER_URL);
  if (parsedUrl.protocol !== "https:") {
    console.error("Error: NSIGHT_SERVER_URL must use HTTPS (e.g. https://www.systemmonitor.us).");
    process.exit(1);
  }
} catch {
  console.error(`Error: NSIGHT_SERVER_URL is not a valid URL: "${NSIGHT_SERVER_URL}"`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Initialise N-sight API client
// ---------------------------------------------------------------------------
const nsightClient = new NsightClient({
  apiKey: NSIGHT_API_KEY,
  serverUrl: NSIGHT_SERVER_URL,
  clientId: process.env.NSIGHT_CLIENT_ID || undefined,
  rateLimitPerMin: process.env.NSIGHT_RATE_LIMIT_PER_MIN
    ? parseInt(process.env.NSIGHT_RATE_LIMIT_PER_MIN, 10)
    : 60,
});

// ---------------------------------------------------------------------------
// Session guard — prevents list_software, list_hardware, list_device_asset_details
// from being called in a loop/batch across multiple devices
// ---------------------------------------------------------------------------
const sessionGuard = new SessionGuard(15); // 15-second window

// ---------------------------------------------------------------------------
// Register all read-only tools
// ---------------------------------------------------------------------------
const tools = [
  // Aggregate tools
  listAllSitesTool,
  getEnvironmentSummaryTool,
  // Per-level tools
  listClientsTool,
  listFailingChecksTool,
  listSitesTool,
  listDevicesTool,
  getDeviceAssetsTool,
  listChecksTool,
  listOutagesTool,
  getCheckOutputTool,
  listADUsersTool,
  listPatchesTool,
  listAVThreatsTool,
  listAVScansTool,
  listAVQuarantineTool,
  listHardwareTool,
  listSoftwareTool,
  listBackupSessionsTool,
  listBackupHistoryTool,
  listDriveHistoryTool,
  listPerformanceHistoryTool,
  listClientLicenseCountTool,
  listDeviceAssetDetailsTool,
];

// ---------------------------------------------------------------------------
// Create and configure MCP server
// ---------------------------------------------------------------------------
const server = new Server(
  { name: "nsight-readonly", version: "0.1.0" },
  { capabilities: { tools: {}, logging: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const ctx = new McpContext(server, request.params._meta?.progressToken);

  try {
    await ctx.log("info", `Tool called: ${name}`);
    await ctx.progress(0, 100);

    let text: string;

    switch (name) {
      case "list_all_sites":
        text = await listAllSites(nsightClient, args as Record<string, never>);
        break;
      case "get_environment_summary":
        text = await getEnvironmentSummary(nsightClient, args as { client_name?: string; site_names?: string[] });
        break;
      case "list_clients":
        text = await listClients(nsightClient, args as Record<string, never>);
        break;

      case "list_failing_checks":
        text = await listFailingChecks(
          nsightClient,
          args as { clientid?: number; check_type?: string }
        );
        break;

      case "list_sites":
        text = await listSites(nsightClient, args as { clientid: number });
        break;

      case "list_devices":
        text = await listDevices(nsightClient, args as { client_name?: string; site_name?: string; siteid: number });
        break;

      case "get_device_assets":
        text = await getDeviceAssets(
          nsightClient,
          args as { clientid: number; devicetype: "server" | "workstation"; deviceid: number }
        );
        break;

      case "list_checks":
        text = await listChecks(nsightClient, args as { deviceid: number });
        break;

      case "list_outages":
        text = await listOutages(nsightClient, args as { deviceid: number });
        break;

      case "get_check_output":
        text = await getCheckOutput(nsightClient, args as { checkid: number });
        break;

      case "list_ad_users":
        text = await listADUsers(nsightClient, args as { siteid: number });
        break;

      case "list_patches":
        text = await listPatches(nsightClient, args as { deviceid: number });
        break;

      case "list_av_threats":
        text = await listAVThreats(
          nsightClient,
          args as { deviceid: number; engine_version?: number }
        );
        break;

      case "list_av_scans":
        text = await listAVScans(
          nsightClient,
          args as { deviceid: number; details?: "YES" | "NO"; engine_version?: number }
        );
        break;

      case "list_av_quarantine":
        text = await listAVQuarantine(
          nsightClient,
          args as { deviceid: number; items?: "CURRENT" | "PREVIOUS" | "ALL"; engine_version?: number }
        );
        break;

      case "list_hardware": {
        const guardError = sessionGuard.check("list_hardware", (args as any).device_name ?? "");
        if (guardError) { text = guardError; break; }
        try { text = await listHardware(nsightClient, args as { device_name: string; assetid: number }); }
        finally { sessionGuard.complete("list_hardware"); }
        break;
      }

      case "list_software": {
        const guardError = sessionGuard.check("list_software", (args as any).device_name ?? "");
        if (guardError) { text = guardError; break; }
        try { text = await listSoftware(nsightClient, args as { device_name: string; assetid: number }); }
        finally { sessionGuard.complete("list_software"); }
        break;
      }

      case "list_backup_sessions":
        text = await listBackupSessions(nsightClient, args as { deviceid: number });
        break;

      case "list_backup_history":
        text = await listBackupHistory(
          nsightClient,
          args as { deviceid: number; offset?: boolean }
        );
        break;

      case "list_drive_history":
        text = await listDriveHistory(
          nsightClient,
          args as { deviceid: number; interval: "DAY" | "WEEK" | "MONTH"; since?: string }
        );
        break;

      case "list_performance_history":
        text = await listPerformanceHistory(nsightClient, args as { deviceid: number });
        break;

      case "list_client_license_count":
        text = await listClientLicenseCount(nsightClient, args as { clientid: number });
        break;

      case "list_device_asset_details": {
        const guardError = sessionGuard.check("list_device_asset_details", (args as any).device_name ?? "");
        if (guardError) { text = guardError; break; }
        try { text = await listDeviceAssetDetails(nsightClient, args as { device_name: string; deviceid: number }); }
        finally { sessionGuard.complete("list_device_asset_details"); }
        break;
      }

      default:
        throw new Error(`Unknown tool: "${name}"`);
    }

    await ctx.progress(100, 100);
    await ctx.log("info", `Tool completed: ${name}`);

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.log("error", `Tool failed: ${name} — ${message}`);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start server on stdio transport
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("N-sight MCP Read-Only Server running on stdio");
