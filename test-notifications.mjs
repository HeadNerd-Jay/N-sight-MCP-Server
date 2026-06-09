/**
 * test-notifications.mjs
 *
 * Simple MCP test client — spawns the read-only server, calls list_clients,
 * and prints all protocol messages including logging and progress notifications.
 *
 * Run with: node test-notifications.mjs
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

const SERVER_PATH = new URL(
  "./dist/readonly-server.js",
  import.meta.url
).pathname.replace(/^\/([A-Z]:)/, "$1").replace(/%20/g, " "); // fix Windows path + spaces

// Inherit the full environment (includes values loaded from .env above)
const env = { ...process.env };

console.log("=== N-sight MCP Notification Tester ===\n");
console.log(`Spawning server: ${SERVER_PATH}\n`);

const server = spawn(process.execPath, [SERVER_PATH], {
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

server.stderr.on("data", (data) => {
  console.log(`[SERVER STDERR] ${data.toString().trim()}`);
});

server.on("error", (err) => {
  console.error(`[SPAWN ERROR] ${err.message}`);
  process.exit(1);
});

// Read newline-delimited JSON from server stdout
const rl = createInterface({ input: server.stdout });
const pending = new Map();
let msgId = 1;

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);

    // Notifications (logging + progress)
    if (!msg.id) {
      const method = msg.method ?? "unknown";

      if (method === "notifications/message") {
        const { level, data } = msg.params ?? {};
        console.log(`\n📋 LOG [${level?.toUpperCase()}]: ${typeof data === "object" ? JSON.stringify(data) : data}`);
      } else if (method === "notifications/progress") {
        const { progress, total } = msg.params ?? {};
        console.log(`⏳ PROGRESS: ${progress}/${total}`);
      } else {
        console.log(`\n🔔 NOTIFICATION [${method}]:`, JSON.stringify(msg.params, null, 2));
      }
      return;
    }

    // Responses to our requests
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  } catch {
    // ignore non-JSON lines
  }
});

function send(message) {
  const json = JSON.stringify(message);
  server.stdin.write(json + "\n");
}

function request(method, params = {}) {
  return new Promise((resolve) => {
    const id = msgId++;
    pending.set(id, resolve);
    send({ jsonrpc: "2.0", id, method, params });
  });
}

async function run() {
  // 1. Initialise
  console.log("1. Sending initialize...");
  const initRes = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { logging: {} },
    clientInfo: { name: "test-client", version: "1.0.0" },
  });
  console.log(`   Server: ${initRes.result?.serverInfo?.name} v${initRes.result?.serverInfo?.version}`);
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  // 2. List tools
  console.log("\n2. Listing tools...");
  const toolsRes = await request("tools/list");
  const tools = toolsRes.result?.tools ?? [];
  console.log(`   Found ${tools.length} tools: ${tools.map(t => t.name).join(", ")}`);

  // 3. Call list_clients — watch for log + progress notifications
  console.log("\n3. Calling list_clients — watch for notifications below...\n");
  const result = await request("tools/call", {
    name: "list_clients",
    arguments: {},
  });

  const text = result.result?.content?.[0]?.text ?? "";
  try {
    const data = JSON.parse(text);
    console.log(`\n✅ Result: ${data.total_clients} clients returned`);
  } catch {
    console.log(`\n✅ Result: ${text}`);
  }

  // 4. Done
  console.log("\n=== Test complete. All notifications above. ===");
  server.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  server.kill();
  process.exit(1);
});
