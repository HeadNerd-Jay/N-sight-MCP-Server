/**
 * test-commands.mjs
 *
 * Exercises every mcp-terminal.mjs shortcut command against the live server
 * and reports PASS / FAIL / BLOCKED for each.
 *
 * Run: node test-commands.mjs
 */

import { spawn } from "child_process";
import { createInterface } from "readline";

const SERVER_PATH = new URL("./dist/readonly-server.js", import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, "$1").replace(/%20/g, " ");

const env = {
  ...process.env,
  NSIGHT_API_KEY:    "REDACTED_API_KEY",
  NSIGHT_SERVER_URL: "https://www.am.remote.management",
};

// ── ANSI colours ────────────────────────────────────────────────────────────
const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m",
      B = "\x1b[34m", D = "\x1b[2m",  X = "\x1b[0m", BOLD = "\x1b[1m";

// ── Spawn server ────────────────────────────────────────────────────────────
const server = spawn(process.execPath, [SERVER_PATH], {
  env, stdio: ["pipe", "pipe", "pipe"],
});

server.stderr.on("data", d =>
  process.stdout.write(`${D}[server] ${d.toString().trim()}${X}\n`)
);
server.on("error", err => { console.error("Spawn error:", err.message); process.exit(1); });

// ── MCP wire ────────────────────────────────────────────────────────────────
const pending = new Map();
let msgId = 1;
const rl = createInterface({ input: server.stdout });

rl.on("line", line => {
  if (!line.trim()) return;
  let msg; try { msg = JSON.parse(line); } catch { return; }
  if (msg.id) {
    const resolve = pending.get(msg.id);
    if (resolve) { pending.delete(msg.id); resolve(msg); }
  }
});

function send(m) { server.stdin.write(JSON.stringify(m) + "\n"); }
function request(method, params = {}) {
  return new Promise(resolve => {
    const id = msgId++;
    pending.set(id, resolve);
    send({ jsonrpc: "2.0", id, method, params });
  });
}

// ── Call helper ─────────────────────────────────────────────────────────────
async function callTool(name, args = {}) {
  const res = await request("tools/call", { name, arguments: args });
  if (res.error) return { ok: false, error: res.error.message, raw: res };
  const text = res.result?.content?.[0]?.text ?? "";
  try {
    const data = JSON.parse(text);
    return { ok: true, data, text };
  } catch {
    return { ok: true, data: null, text };
  }
}

// ── Result printer ───────────────────────────────────────────────────────────
const results = [];

function report(label, result, details = "") {
  const icon  = result === "PASS"    ? `${G}✔ PASS${X}`
              : result === "FAIL"    ? `${R}✗ FAIL${X}`
              : result === "BLOCKED" ? `${Y}⊘ BLOCKED${X}`
              :                        `${B}? ${result}${X}`;
  const line = `  ${icon}  ${label}${details ? `  ${D}${details}${X}` : ""}`;
  console.log(line);
  results.push({ label, result, details });
}

// ── Resolve IDs we need for chained tests ────────────────────────────────────
let clientId   = null;   // first real client
let clientName = null;
let siteId     = null;   // first site for that client
let siteName   = null;
let deviceId   = null;   // first device at that site
let deviceName = null;
let assetId    = null;
let deviceType = "workstation";

// ── Main test runner ─────────────────────────────────────────────────────────
async function run() {
  // Init
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { logging: {} },
    clientInfo: { name: "test-runner", version: "1.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  console.log(`\n${BOLD}═══════════════════════════════════════════════════${X}`);
  console.log(`${BOLD}  N-sight MCP Terminal Command Test Suite${X}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════${X}\n`);

  // ── 1. tools ────────────────────────────────────────────────────────────
  console.log(`${BOLD}[1] tools list${X}`);
  const toolsRes = await request("tools/list");
  const tools = toolsRes.result?.tools ?? [];
  if (tools.length > 0) {
    report("tools", "PASS", `${tools.length} tools loaded`);
  } else {
    report("tools", "FAIL", "no tools returned");
  }

  // ── 2. clients ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}[2] clients${X}`);
  const clientsRes = await callTool("list_clients");
  if (!clientsRes.ok) {
    report("clients", "FAIL", clientsRes.error);
  } else {
    const list = clientsRes.data?.clients ?? clientsRes.data;
    const first = Array.isArray(list) ? list[0] : null;
    clientId   = first?.client_id ?? null;
    clientName = first?.name ?? null;
    report("clients", "PASS", `${clientsRes.data?.total_clients ?? (list?.length ?? "?")} clients — first: "${clientName}" (id ${clientId})`);
  }

  // ── 3. sites <clientid> ─────────────────────────────────────────────────
  console.log(`\n${BOLD}[3] sites <clientid>${X}`);
  if (!clientId) {
    report("sites <clientid>", "BLOCKED", "no clientId from step 2");
  } else {
    const sitesRes = await callTool("list_sites", { clientid: clientId });
    if (!sitesRes.ok) {
      report("sites <clientid>", "FAIL", sitesRes.error);
    } else {
      const list = sitesRes.data?.sites ?? sitesRes.data;
      const first = Array.isArray(list) ? list[0] : null;
      siteId   = first?.site_id ?? null;
      siteName = first?.name ?? null;
      report("sites <clientid>", "PASS", `${sitesRes.data?.total_sites ?? list?.length ?? "?"} sites — first: "${siteName}" (id ${siteId})`);
    }
  }

  // ── 4. devices <siteid> ──────────────────────────────────────────────────
  console.log(`\n${BOLD}[4] devices <siteid>${X}`);
  if (!siteId) {
    report("devices <siteid>", "BLOCKED", "no siteId from step 3");
  } else {
    const devRes = await callTool("list_devices", {
      siteid: siteId,
      client_name: clientName ?? "",
      site_name: siteName ?? "",
    });
    if (!devRes.ok) {
      report("devices <siteid>", "FAIL", devRes.error);
    } else {
      const list = devRes.data?.devices ?? devRes.data;
      const first = Array.isArray(list) ? list[0] : null;
      deviceId   = first?.device_id ?? null;
      deviceName = first?.name ?? null;
      assetId    = first?.asset_id ?? null;
      deviceType = first?.device_type ?? "workstation";
      report("devices <siteid>", "PASS", `${devRes.data?.total_devices ?? list?.length ?? "?"} devices — first: "${deviceName}" (id ${deviceId}, assetId ${assetId})`);
    }
  }

  // ── 5. summary <customer name> ──────────────────────────────────────────
  console.log(`\n${BOLD}[5] summary <customer name>${X}`);
  if (!clientName) {
    report("summary <customer name>", "BLOCKED", "no clientName from step 2");
  } else {
    const sumRes = await callTool("get_environment_summary", { client_name: clientName });
    if (!sumRes.ok) {
      report("summary <customer name>", "FAIL", sumRes.error ?? sumRes.text);
    } else if (sumRes.text?.startsWith("Error:")) {
      report("summary <customer name>", "FAIL", sumRes.text);
    } else {
      report("summary <customer name>", "PASS",
        `client: ${sumRes.data?.client_name ?? "?"}, sites: ${sumRes.data?.total_sites ?? "?"}, devices: ${sumRes.data?.total_devices ?? "?"}`);
    }
  }

  // ── 6. hardware <device> <assetid> ──────────────────────────────────────
  console.log(`\n${BOLD}[6] hardware <device_name> <assetid>${X}`);
  if (!deviceName || !assetId) {
    report("hardware <device> <assetid>", "BLOCKED", "no deviceName/assetId from step 4");
  } else {
    const hwRes = await callTool("list_hardware", { device_name: deviceName, assetid: assetId });
    if (!hwRes.ok) {
      report("hardware <device> <assetid>", "FAIL", hwRes.error);
    } else if (hwRes.text?.startsWith("Error:") || hwRes.text?.startsWith("STOP")) {
      report("hardware <device> <assetid>", "FAIL", hwRes.text?.slice(0, 120));
    } else {
      const count = hwRes.data?.total_items ?? hwRes.data?.hardware?.length ?? "?";
      report("hardware <device> <assetid>", "PASS", `${count} hardware items for "${deviceName}"`);
    }
  }

  // ── 7. software <device> <assetid> ──────────────────────────────────────
  console.log(`\n${BOLD}[7] software <device_name> <assetid>${X}`);
  if (!deviceName || !assetId) {
    report("software <device> <assetid>", "BLOCKED", "no deviceName/assetId from step 4");
  } else {
    const swRes = await callTool("list_software", { device_name: deviceName, assetid: assetId });
    if (!swRes.ok) {
      report("software <device> <assetid>", "FAIL", swRes.error);
    } else if (swRes.text?.startsWith("Error:") || swRes.text?.startsWith("STOP")) {
      report("software <device> <assetid>", "FAIL", swRes.text?.slice(0, 120));
    } else {
      const count = swRes.data?.total_items ?? swRes.data?.software?.length ?? "?";
      report("software <device> <assetid>", "PASS", `${count} software items for "${deviceName}"`);
    }
  }

  // ── 8. failing ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}[8] failing${X}`);
  const failRes = await callTool("list_failing_checks");
  if (!failRes.ok) {
    report("failing", "FAIL", failRes.error);
  } else {
    const count = failRes.data?.total_failures ?? failRes.data?.failures?.length ?? "?";
    report("failing", "PASS", `${count} failing check(s)`);
  }

  // ── 9. call list_all_sites ───────────────────────────────────────────────
  console.log(`\n${BOLD}[9] call list_all_sites${X}`);
  const allSitesRes = await callTool("list_all_sites");
  if (!allSitesRes.ok) {
    report("call list_all_sites", "FAIL", allSitesRes.error);
  } else {
    const count = allSitesRes.data?.total_sites ?? allSitesRes.data?.length ?? "?";
    report("call list_all_sites", "PASS", `${count} total sites`);
  }

  // ── 10. call get_device_assets ───────────────────────────────────────────
  console.log(`\n${BOLD}[10] call get_device_assets${X}`);
  if (!clientId || !deviceId) {
    report("call get_device_assets", "BLOCKED", "no clientId/deviceId");
  } else {
    const assetRes = await callTool("get_device_assets", {
      clientid: clientId, devicetype: deviceType, deviceid: deviceId,
    });
    if (!assetRes.ok) {
      report("call get_device_assets", "FAIL", assetRes.error);
    } else if (assetRes.text?.startsWith("Error:")) {
      report("call get_device_assets", "FAIL", assetRes.text?.slice(0, 120));
    } else {
      report("call get_device_assets", "PASS", "returned asset data");
    }
  }

  // ── 11. call list_device_asset_details ──────────────────────────────────
  console.log(`\n${BOLD}[11] call list_device_asset_details${X}`);
  if (!deviceId || !deviceName) {
    report("call list_device_asset_details", "BLOCKED", "no deviceId/deviceName");
  } else {
    const detRes = await callTool("list_device_asset_details", {
      device_name: deviceName, deviceid: deviceId,
    });
    if (!detRes.ok) {
      report("call list_device_asset_details", "FAIL", detRes.error);
    } else if (detRes.text?.startsWith("Error:") || detRes.text?.startsWith("STOP")) {
      report("call list_device_asset_details", "FAIL", detRes.text?.slice(0, 120));
    } else {
      report("call list_device_asset_details", "PASS", `details for "${deviceName}"`);
    }
  }

  // ── 12. call list_checks ─────────────────────────────────────────────────
  console.log(`\n${BOLD}[12] call list_checks${X}`);
  if (!deviceId) {
    report("call list_checks", "BLOCKED", "no deviceId");
  } else {
    const chkRes = await callTool("list_checks", { deviceid: deviceId });
    if (!chkRes.ok) {
      report("call list_checks", "FAIL", chkRes.error);
    } else {
      const count = chkRes.data?.total_checks ?? chkRes.data?.checks?.length ?? "?";
      report("call list_checks", "PASS", `${count} checks for device ${deviceId}`);
    }
  }

  // ── 13. call list_patches ────────────────────────────────────────────────
  console.log(`\n${BOLD}[13] call list_patches${X}`);
  if (!deviceId) {
    report("call list_patches", "BLOCKED", "no deviceId");
  } else {
    const patchRes = await callTool("list_patches", { deviceid: deviceId });
    if (!patchRes.ok) {
      report("call list_patches", "FAIL", patchRes.error);
    } else if (!patchRes.data) {
      report("call list_patches", "PASS", `no data: ${patchRes.text?.slice(0,60)}`);
    } else {
      const count = patchRes.data?.total_patches ?? patchRes.data?.patches?.length ?? "?";
      report("call list_patches", "PASS", `${count} patches for device ${deviceId}`);
    }
  }

  // ── 14. call list_av_threats ─────────────────────────────────────────────
  console.log(`\n${BOLD}[14] call list_av_threats${X}`);
  if (!deviceId) {
    report("call list_av_threats", "BLOCKED", "no deviceId");
  } else {
    const avRes = await callTool("list_av_threats", { deviceid: deviceId });
    if (!avRes.ok) {
      report("call list_av_threats", "FAIL", avRes.error);
    } else {
      report("call list_av_threats", "PASS", "returned AV threat data");
    }
  }

  // ── 15. call list_av_scans ───────────────────────────────────────────────
  console.log(`\n${BOLD}[15] call list_av_scans${X}`);
  if (!deviceId) {
    report("call list_av_scans", "BLOCKED", "no deviceId");
  } else {
    const scanRes = await callTool("list_av_scans", { deviceid: deviceId });
    if (!scanRes.ok) {
      report("call list_av_scans", "FAIL", scanRes.error);
    } else {
      report("call list_av_scans", "PASS", "returned AV scan data");
    }
  }

  // ── 16. call list_av_quarantine ──────────────────────────────────────────
  console.log(`\n${BOLD}[16] call list_av_quarantine${X}`);
  if (!deviceId) {
    report("call list_av_quarantine", "BLOCKED", "no deviceId");
  } else {
    const qRes = await callTool("list_av_quarantine", { deviceid: deviceId });
    if (!qRes.ok) {
      report("call list_av_quarantine", "FAIL", qRes.error);
    } else {
      report("call list_av_quarantine", "PASS", "returned quarantine data");
    }
  }

  // ── 17. call list_backup_sessions ───────────────────────────────────────
  console.log(`\n${BOLD}[17] call list_backup_sessions${X}`);
  if (!deviceId) {
    report("call list_backup_sessions", "BLOCKED", "no deviceId");
  } else {
    const bkRes = await callTool("list_backup_sessions", { deviceid: deviceId });
    if (!bkRes.ok) {
      report("call list_backup_sessions", "FAIL", bkRes.error);
    } else {
      report("call list_backup_sessions", "PASS", "returned backup session data");
    }
  }

  // ── 18. call list_backup_history ────────────────────────────────────────
  console.log(`\n${BOLD}[18] call list_backup_history${X}`);
  if (!deviceId) {
    report("call list_backup_history", "BLOCKED", "no deviceId");
  } else {
    const bhRes = await callTool("list_backup_history", { deviceid: deviceId });
    if (!bhRes.ok) {
      report("call list_backup_history", "FAIL", bhRes.error);
    } else {
      report("call list_backup_history", "PASS", "returned backup history data");
    }
  }

  // ── 19. call list_performance_history ───────────────────────────────────
  console.log(`\n${BOLD}[19] call list_performance_history${X}`);
  if (!deviceId) {
    report("call list_performance_history", "BLOCKED", "no deviceId");
  } else {
    const perfRes = await callTool("list_performance_history", { deviceid: deviceId });
    if (!perfRes.ok) {
      report("call list_performance_history", "FAIL", perfRes.error);
    } else {
      report("call list_performance_history", "PASS", "returned performance history");
    }
  }

  // ── 20. call list_drive_history ──────────────────────────────────────────
  console.log(`\n${BOLD}[20] call list_drive_history${X}`);
  if (!deviceId) {
    report("call list_drive_history", "BLOCKED", "no deviceId");
  } else {
    const driveRes = await callTool("list_drive_history", { deviceid: deviceId, interval: "DAY" });
    if (!driveRes.ok) {
      report("call list_drive_history", "FAIL", driveRes.error);
    } else {
      report("call list_drive_history", "PASS", "returned drive history");
    }
  }

  // ── 21. call list_outages ────────────────────────────────────────────────
  console.log(`\n${BOLD}[21] call list_outages${X}`);
  if (!deviceId) {
    report("call list_outages", "BLOCKED", "no deviceId");
  } else {
    const outRes = await callTool("list_outages", { deviceid: deviceId });
    if (!outRes.ok) {
      report("call list_outages", "FAIL", outRes.error);
    } else {
      report("call list_outages", "PASS", "returned outage data");
    }
  }

  // ── 22. call list_ad_users ───────────────────────────────────────────────
  console.log(`\n${BOLD}[22] call list_ad_users${X}`);
  if (!siteId) {
    report("call list_ad_users", "BLOCKED", "no siteId");
  } else {
    const adRes = await callTool("list_ad_users", { siteid: siteId });
    if (!adRes.ok) {
      report("call list_ad_users", "FAIL", adRes.error);
    } else if (!adRes.data) {
      report("call list_ad_users", "PASS", `no data: ${adRes.text?.slice(0,60)}`);
    } else {
      const count = adRes.data?.total_users ?? adRes.data?.users?.length ?? "?";
      report("call list_ad_users", "PASS", `${count} AD users for site ${siteId}`);
    }
  }

  // ── 23. call list_client_license_count ──────────────────────────────────
  console.log(`\n${BOLD}[23] call list_client_license_count${X}`);
  if (!clientId) {
    report("call list_client_license_count", "BLOCKED", "no clientId");
  } else {
    const licRes = await callTool("list_client_license_count", { clientid: clientId });
    if (!licRes.ok) {
      report("call list_client_license_count", "FAIL", licRes.error);
    } else {
      report("call list_client_license_count", "PASS", "returned license count data");
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const pass    = results.filter(r => r.result === "PASS").length;
  const fail    = results.filter(r => r.result === "FAIL").length;
  const blocked = results.filter(r => r.result === "BLOCKED").length;

  console.log(`\n${BOLD}═══════════════════════════════════════════════════${X}`);
  console.log(`${BOLD}  Summary: ${G}${pass} PASS${X}  ${R}${fail} FAIL${X}  ${Y}${blocked} BLOCKED${X}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════${X}\n`);

  if (fail > 0) {
    console.log(`${BOLD}${R}Failed tests:${X}`);
    results.filter(r => r.result === "FAIL").forEach(r =>
      console.log(`  ${R}✗${X} ${r.label}  ${D}${r.details}${X}`)
    );
    console.log();
  }
  if (blocked > 0) {
    console.log(`${BOLD}${Y}Blocked tests (dependency failed):${X}`);
    results.filter(r => r.result === "BLOCKED").forEach(r =>
      console.log(`  ${Y}⊘${X} ${r.label}  ${D}${r.details}${X}`)
    );
    console.log();
  }

  server.kill();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); server.kill(); process.exit(1); });
