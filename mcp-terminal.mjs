/**
 * mcp-terminal.mjs
 *
 * Interactive terminal client for the N-sight MCP Read-Only Server.
 * Shows all log and progress notifications in real time as tools execute.
 *
 * Run: node mcp-terminal.mjs
 */

import { spawn } from "child_process";
import { createInterface } from "readline";
import { config } from "dotenv";

// Load .env from the project root (same directory as this script)
config();

if (!process.env.NSIGHT_API_KEY || !process.env.NSIGHT_SERVER_URL) {
  console.error("Error: NSIGHT_API_KEY and NSIGHT_SERVER_URL must be set.");
  console.error("Copy .env.example to .env and fill in your credentials.");
  process.exit(1);
}

// ── Colours ────────────────────────────────────────────────────────────────
const c = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  red:     "\x1b[31m",
  magenta: "\x1b[35m",
  blue:    "\x1b[34m",
  white:   "\x1b[37m",
};

const LOG_COLOURS = {
  info:      c.cyan,
  notice:    c.green,
  warning:   c.yellow,
  error:     c.red,
  critical:  c.red + c.bold,
  emergency: c.red + c.bold,
  debug:     c.dim,
};

// ── Server path ────────────────────────────────────────────────────────────
const SERVER_PATH = new URL("./dist/readonly-server.js", import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, "$1").replace(/%20/g, " ");

// Inherit the full environment (includes values loaded from .env above)
const env = { ...process.env };

// ── Spawn server ───────────────────────────────────────────────────────────
const server = spawn(process.execPath, [SERVER_PATH], {
  env, stdio: ["pipe", "pipe", "pipe"],
});

server.stderr.on("data", d =>
  process.stdout.write(`${c.dim}[server] ${d.toString().trim()}${c.reset}\n`)
);
server.on("error", err => { console.error("Spawn error:", err.message); process.exit(1); });

// ── MCP wire protocol ──────────────────────────────────────────────────────
const pending = new Map();
let msgId = 1;

const serverLines = createInterface({ input: server.stdout });

serverLines.on("line", line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  // Notifications
  if (msg.method && !msg.id) {
    if (msg.method === "notifications/message") {
      const { level = "info", data } = msg.params ?? {};
      const col = LOG_COLOURS[level] ?? c.white;
      const text = typeof data === "object" ? data.message ?? JSON.stringify(data) : data;
      process.stdout.write(`  ${col}◆ [${level.toUpperCase()}]${c.reset} ${text}\n`);
    } else if (msg.method === "notifications/progress") {
      const { progress, total, progressToken } = msg.params ?? {};
      const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
      const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
      process.stdout.write(`  ${c.blue}⏳ PROGRESS${c.reset} [${bar}] ${pct}%\n`);
    }
    return;
  }

  // Responses
  if (msg.id) {
    const resolve = pending.get(msg.id);
    if (resolve) { pending.delete(msg.id); resolve(msg); }
  }
});

function send(message) {
  server.stdin.write(JSON.stringify(message) + "\n");
}

function request(method, params = {}, progressToken) {
  return new Promise((resolve) => {
    const id = msgId++;
    const meta = progressToken ? { _meta: { progressToken } } : {};
    pending.set(id, resolve);
    send({ jsonrpc: "2.0", id, method, params: { ...params, ...meta } });
  });
}

// ── Tool catalogue ─────────────────────────────────────────────────────────
let TOOLS = [];

// ── Initialise ─────────────────────────────────────────────────────────────
async function init() {
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { logging: {} },
    clientInfo: { name: "mcp-terminal", version: "1.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
  const res = await request("tools/list");
  TOOLS = res.result?.tools ?? [];
}

// ── Call a tool ─────────────────────────────────────────────────────────────
async function callTool(name, args = {}) {
  const token = `progress-${msgId}`;
  process.stdout.write(`\n${c.magenta}▶ Calling ${c.bold}${name}${c.reset}${c.magenta} ...${c.reset}\n`);
  const res = await request("tools/call", { name, arguments: args }, token);
  if (res.error) {
    process.stdout.write(`${c.red}✗ Error: ${res.error.message}${c.reset}\n`);
    return;
  }
  const text = res.result?.content?.[0]?.text ?? "";
  try {
    const data = JSON.parse(text);
    process.stdout.write(`\n${c.green}✔ Result:${c.reset}\n${JSON.stringify(data, null, 2)}\n`);
  } catch {
    process.stdout.write(`\n${c.green}✔ Result:${c.reset}\n${text}\n`);
  }
}

// ── Simple command parser ──────────────────────────────────────────────────
async function handleInput(input) {
  const line = input.trim();
  if (!line) return;

  // Built-in commands
  if (line === "help" || line === "?") {
    console.log(`
${c.bold}Available commands:${c.reset}
  ${c.cyan}tools${c.reset}                         List all available tools
  ${c.cyan}clients${c.reset}                       List all clients
  ${c.cyan}sites <clientid>${c.reset}              List sites for a client
  ${c.cyan}devices <siteid>${c.reset}              List devices for a site (requires client/site name)
  ${c.cyan}summary <customer name>${c.reset}       Get environment summary for a customer
  ${c.cyan}software <device> <assetid>${c.reset}   List software for a device
  ${c.cyan}hardware <device> <assetid>${c.reset}   List hardware for a device
  ${c.cyan}failing${c.reset}                       List all failing checks
  ${c.cyan}call <tool> <json args>${c.reset}       Call any tool with raw JSON args
  ${c.cyan}quit${c.reset} / ${c.cyan}exit${c.reset}                   Exit
`);
    return;
  }

  if (line === "tools") {
    console.log(`\n${c.bold}${TOOLS.length} tools available:${c.reset}`);
    TOOLS.forEach(t => console.log(`  ${c.cyan}${t.name}${c.reset} — ${t.description?.split(".")[0]}`));
    console.log();
    return;
  }

  if (line === "clients") {
    await callTool("list_clients");
    return;
  }

  if (line === "failing") {
    await callTool("list_failing_checks");
    return;
  }

  if (line.startsWith("sites ")) {
    const clientid = parseInt(line.split(" ")[1]);
    if (isNaN(clientid)) { console.log("Usage: sites <clientid>"); return; }
    await callTool("list_sites", { clientid });
    return;
  }

  if (line.startsWith("devices ")) {
    const parts = line.split(" ");
    const siteid = parseInt(parts[1]);
    if (isNaN(siteid)) { console.log("Usage: devices <siteid>"); return; }
    await callTool("list_devices", { siteid, client_name: parts[2] ?? "", site_name: parts[3] ?? "" });
    return;
  }

  if (line.startsWith("summary ")) {
    const customer = line.slice(8).trim();
    await callTool("get_environment_summary", { client_name: customer });
    return;
  }

  if (line.startsWith("software ")) {
    const parts = line.split(" ");
    const device = parts[1];
    const assetid = parseInt(parts[2]);
    if (!device || isNaN(assetid)) { console.log("Usage: software <device_name> <assetid>"); return; }
    await callTool("list_software", { device_name: device, assetid });
    return;
  }

  if (line.startsWith("hardware ")) {
    const parts = line.split(" ");
    const device = parts[1];
    const assetid = parseInt(parts[2]);
    if (!device || isNaN(assetid)) { console.log("Usage: hardware <device_name> <assetid>"); return; }
    await callTool("list_hardware", { device_name: device, assetid });
    return;
  }

  if (line.startsWith("call ")) {
    const rest = line.slice(5).trim();
    const spaceIdx = rest.indexOf(" ");
    const toolName = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
    const argsStr  = spaceIdx === -1 ? "{}" : rest.slice(spaceIdx + 1);
    try {
      const args = JSON.parse(argsStr);
      await callTool(toolName, args);
    } catch {
      console.log(`${c.red}Invalid JSON args. Example: call list_sites {"clientid":129052}${c.reset}`);
    }
    return;
  }

  if (line === "quit" || line === "exit") {
    console.log("Bye!");
    server.kill();
    process.exit(0);
  }

  console.log(`${c.yellow}Unknown command. Type 'help' for available commands.${c.reset}`);
}

// ── REPL ───────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(`${c.bold}${c.cyan}
╔══════════════════════════════════════════╗
║     N-sight MCP Interactive Terminal     ║
║     Type 'help' for available commands   ║
╚══════════════════════════════════════════╝${c.reset}`);

  process.stdout.write("\nConnecting to server...");
  await init();
  process.stdout.write(` ${c.green}Connected!${c.reset} (${TOOLS.length} tools loaded)\n`);
  console.log(`${c.dim}Log and progress notifications will appear as tools execute.${c.reset}\n`);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const prompt = () => rl.question(`${c.bold}${c.cyan}nsight>${c.reset} `, async (input) => {
    await handleInput(input);
    prompt();
  });

  prompt();
}

main().catch(err => { console.error(err); process.exit(1); });
