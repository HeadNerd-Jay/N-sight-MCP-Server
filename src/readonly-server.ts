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

import { NsightClient } from "./core/client.js";
import { listClientsTool, listClients } from "./tools/readonly/list-clients.js";
import { listFailingChecksTool, listFailingChecks } from "./tools/readonly/list-failing-checks.js";

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
// Register all read-only tools
// ---------------------------------------------------------------------------
const tools = [
  listClientsTool,
  listFailingChecksTool,
];

// ---------------------------------------------------------------------------
// Create and configure MCP server
// ---------------------------------------------------------------------------
const server = new Server(
  { name: "nsight-readonly", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let text: string;

    switch (name) {
      case "list_clients":
        text = await listClients(nsightClient, args as Record<string, never>);
        break;

      case "list_failing_checks":
        text = await listFailingChecks(
          nsightClient,
          args as { clientid?: number; check_type?: string }
        );
        break;

      default:
        throw new Error(`Unknown tool: "${name}"`);
    }

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
