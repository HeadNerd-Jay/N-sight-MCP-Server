/**
 * N-sight MCP Production Server
 *
 * Exposes all read-only tools PLUS write/action tools for N-sight RMM.
 * All write operations require explicit confirmation (confirm: true) and are
 * recorded to an append-only audit log before execution.
 *
 * Transport: stdio (standard input/output)
 * Auth:      N-sight API key via environment variable
 *
 * Usage:
 *   npm run dev:production     (development, via tsx)
 *   npm run start:production   (production, from compiled dist/)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

import { NsightClient } from "./core/client.js";
import { AuditLogger } from "./core/audit.js";
import { McpContext } from "./core/mcp-context.js";

// Aggregate tools
import { listAllDevicesTool, listAllDevices } from "./tools/readonly/list-all-devices.js";
import { listAllSitesTool, listAllSites } from "./tools/readonly/list-all-sites.js";
import { getEnvironmentSummaryTool, getEnvironmentSummary } from "./tools/readonly/get-environment-summary.js";
// Read-only tools
import { listClientsTool, listClients } from "./tools/readonly/list-clients.js";
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

// Production (write) tools
import { clearCheckTool, clearCheck } from "./tools/production/clear-check.js";
import { addCheckNoteTool, addCheckNote } from "./tools/production/add-check-note.js";
import { approvePatchTool, approvePatch } from "./tools/production/approve-patch.js";
import { ignorePatchTool, ignorePatch } from "./tools/production/ignore-patch.js";
import { retryPatchTool, retryPatch } from "./tools/production/retry-patch.js";
import { startAVScanTool, startAVScan } from "./tools/production/start-av-scan.js";
import { cancelAVScanTool, cancelAVScan } from "./tools/production/cancel-av-scan.js";
import { releaseQuarantineItemTool, releaseQuarantineItem } from "./tools/production/release-quarantine-item.js";
import { removeQuarantineItemTool, removeQuarantineItem } from "./tools/production/remove-quarantine-item.js";
import { updateAVDefinitionsTool, updateAVDefinitions } from "./tools/production/update-av-definitions.js";
import { runTaskTool, runTask } from "./tools/production/run-task.js";
import { addClientTool, addClient } from "./tools/production/add-client.js";
import { addSiteTool, addSite } from "./tools/production/add-site.js";

dotenv.config();

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

// ---------------------------------------------------------------------------
// Initialise N-sight API client and audit logger
// ---------------------------------------------------------------------------
const nsightClient = new NsightClient({
  apiKey: NSIGHT_API_KEY,
  serverUrl: NSIGHT_SERVER_URL,
  clientId: process.env.NSIGHT_CLIENT_ID || undefined,
  rateLimitPerMin: process.env.NSIGHT_RATE_LIMIT_PER_MIN
    ? parseInt(process.env.NSIGHT_RATE_LIMIT_PER_MIN, 10)
    : 60,
});

const auditLogger = new AuditLogger(
  process.env.NSIGHT_AUDIT_LOG_PATH || "./logs/audit.log",
  process.env.NSIGHT_AUDIT_LOG_ENABLED !== "false"
);

// ---------------------------------------------------------------------------
// Session write limit
// ---------------------------------------------------------------------------
const MAX_WRITES = process.env.NSIGHT_MAX_WRITES_PER_SESSION
  ? parseInt(process.env.NSIGHT_MAX_WRITES_PER_SESSION, 10)
  : 20;

let writeCount = 0;

const WRITE_TOOLS = new Set([
  "clear_check", "add_check_note",
  "approve_patch", "ignore_patch", "retry_patch",
  "start_av_scan", "cancel_av_scan",
  "release_quarantine_item", "remove_quarantine_item", "update_av_definitions",
  "run_task", "add_client", "add_site",
]);

// ---------------------------------------------------------------------------
// Register all tools (read-only + production)
// ---------------------------------------------------------------------------
const tools = [
  // Aggregate tools
  listAllDevicesTool,
  listAllSitesTool,
  getEnvironmentSummaryTool,
  // Read-only
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
  // Production (write)
  clearCheckTool,
  addCheckNoteTool,
  approvePatchTool,
  ignorePatchTool,
  retryPatchTool,
  startAVScanTool,
  cancelAVScanTool,
  releaseQuarantineItemTool,
  removeQuarantineItemTool,
  updateAVDefinitionsTool,
  runTaskTool,
  addClientTool,
  addSiteTool,
];

// ---------------------------------------------------------------------------
// Create and configure MCP server
// ---------------------------------------------------------------------------
const server = new Server(
  { name: "nsight-production", version: "0.1.0" },
  { capabilities: { tools: {}, logging: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const ctx = new McpContext(server, request.params._meta?.progressToken);

  await ctx.log("info", `Tool called: ${name}`);
  await ctx.progress(0, 100);

  // Block confirmed write calls once the session limit is reached.
  // Unconfirmed calls (confirm: false) don't execute anything so they don't count.
  if (WRITE_TOOLS.has(name) && (args as any).confirm === true) {
    if (writeCount >= MAX_WRITES) {
      await ctx.log("warning", `Write limit reached (${writeCount}/${MAX_WRITES}) — ${name} blocked.`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            action: name,
            status: "limit_reached",
            writes_executed: writeCount,
            limit: MAX_WRITES,
            message: `Session write limit of ${MAX_WRITES} reached. Restart the server to reset.`,
          }, null, 2),
        }],
        isError: true,
      };
    }
    writeCount++;
    await ctx.log("info", `Write ${writeCount}/${MAX_WRITES}: ${name}`);
  }

  try {
    let text: string;

    switch (name) {
      // --- Aggregate tools ---
      case "list_all_devices":
        text = await listAllDevices(nsightClient, args as { online_only?: boolean });
        break;
      case "list_all_sites":
        text = await listAllSites(nsightClient, args as Record<string, never>);
        break;
      case "get_environment_summary":
        text = await getEnvironmentSummary(nsightClient, args as Record<string, never>);
        break;

      // --- Read-only tools ---
      case "list_clients":
        text = await listClients(nsightClient, args as Record<string, never>);
        break;
      case "list_failing_checks":
        text = await listFailingChecks(nsightClient, args as { clientid?: number; check_type?: string });
        break;
      case "list_sites":
        text = await listSites(nsightClient, args as { clientid: number });
        break;
      case "list_devices":
        text = await listDevices(nsightClient, args as { siteid: number });
        break;
      case "get_device_assets":
        text = await getDeviceAssets(nsightClient, args as { clientid: number; devicetype: "server" | "workstation"; deviceid: number });
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
        text = await listAVThreats(nsightClient, args as { deviceid: number; engine_version?: number });
        break;
      case "list_av_scans":
        text = await listAVScans(nsightClient, args as { deviceid: number; details?: "YES" | "NO"; engine_version?: number });
        break;
      case "list_av_quarantine":
        text = await listAVQuarantine(nsightClient, args as { deviceid: number; items?: "CURRENT" | "PREVIOUS" | "ALL"; engine_version?: number });
        break;
      case "list_hardware":
        text = await listHardware(nsightClient, args as { assetid: number });
        break;
      case "list_software":
        text = await listSoftware(nsightClient, args as { assetid: number });
        break;
      case "list_backup_sessions":
        text = await listBackupSessions(nsightClient, args as { deviceid: number });
        break;
      case "list_backup_history":
        text = await listBackupHistory(nsightClient, args as { deviceid: number; offset?: boolean });
        break;
      case "list_drive_history":
        text = await listDriveHistory(nsightClient, args as { deviceid: number; interval: "DAY" | "WEEK" | "MONTH"; since?: string });
        break;
      case "list_performance_history":
        text = await listPerformanceHistory(nsightClient, args as { deviceid: number });
        break;
      case "list_client_license_count":
        text = await listClientLicenseCount(nsightClient, args as { clientid: number });
        break;
      case "list_device_asset_details":
        text = await listDeviceAssetDetails(nsightClient, args as { deviceid: number });
        break;

      // --- Production (write) tools ---
      case "clear_check":
        text = await clearCheck(nsightClient, auditLogger, args as { check_id: number; device_id: number; confirm: boolean }, ctx);
        break;
      case "add_check_note":
        text = await addCheckNote(nsightClient, auditLogger, args as { check_id: number; note: string; confirm: boolean }, ctx);
        break;
      case "approve_patch":
        text = await approvePatch(nsightClient, auditLogger, args as { device_id: number; patch_id: number; confirm: boolean }, ctx);
        break;
      case "ignore_patch":
        text = await ignorePatch(nsightClient, auditLogger, args as { device_id: number; patch_id: number; confirm: boolean }, ctx);
        break;
      case "retry_patch":
        text = await retryPatch(nsightClient, auditLogger, args as { device_id: number; patch_id: number; confirm: boolean }, ctx);
        break;
      case "start_av_scan":
        text = await startAVScan(nsightClient, auditLogger, args as { device_id: number; scan_type: "QUICK" | "FULL"; confirm: boolean }, ctx);
        break;
      case "cancel_av_scan":
        text = await cancelAVScan(nsightClient, auditLogger, args as { device_id: number; confirm: boolean }, ctx);
        break;
      case "release_quarantine_item":
        text = await releaseQuarantineItem(nsightClient, auditLogger, args as { device_id: number; quarantine_id: number; confirm: boolean }, ctx);
        break;
      case "remove_quarantine_item":
        text = await removeQuarantineItem(nsightClient, auditLogger, args as { device_id: number; quarantine_id: number; confirm: boolean }, ctx);
        break;
      case "update_av_definitions":
        text = await updateAVDefinitions(nsightClient, auditLogger, args as { device_id: number; confirm: boolean }, ctx);
        break;
      case "run_task":
        text = await runTask(nsightClient, auditLogger, args as { device_id: number; task_id: number; confirm: boolean }, ctx);
        break;
      case "add_client":
        text = await addClient(nsightClient, auditLogger, args as { name: string; confirm: boolean }, ctx);
        break;
      case "add_site":
        text = await addSite(nsightClient, auditLogger, args as { client_id: number; name: string; confirm: boolean }, ctx);
        break;

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
console.error("N-sight MCP Production Server running on stdio (21 read-only + 13 write tools)");
