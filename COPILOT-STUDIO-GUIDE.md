# Copilot Studio Integration Guide
## N-sight AI Connect MCP Server

This guide explains how to connect N-sight AI Connect to Microsoft Copilot Studio,
enabling MSPs to build custom AI agents and copilots that query N-sight RMM data
using natural language.

---

## How It Works

The existing servers (`readonly-server.ts`, `production-server.ts`) use **stdio transport**,
which is how Claude Desktop communicates locally. Copilot Studio is a cloud service hosted
by Microsoft, so it cannot reach a stdio process running on a laptop.

To connect Copilot Studio you need two things:

1. An **HTTP endpoint** — a new server entry point that exposes the same MCP tools over
   Streamable HTTP instead of stdio (the MCP SDK already supports this, no new dependencies needed)
2. A **public HTTPS URL** — either a tunnel for dev/testing or a cloud deployment for production

```
┌─────────────────────────────┐         HTTPS          ┌──────────────────────┐
│   Microsoft Copilot Studio  │  ──────────────────►  │  N-sight MCP Server   │
│   (cloud, any region)       │                        │  (HTTP transport)     │
└─────────────────────────────┘                        │  /mcp endpoint        │
                                                        └──────────┬───────────┘
                                                                   │
                                                              N-sight API
                                                         (reads from .env)
```

---

## Step 1 — Add the HTTP Server Entry Point

The MCP SDK v1.29.0 (already installed) includes `StreamableHTTPServerTransport` and
`createMcpExpressApp`. You need to add `express` as a dependency, then create a new
server file that reuses all the same tools.

### Install Express

```bash
npm install express
npm install --save-dev @types/express
```

### Create `src/http-server.ts`

This file is identical in logic to `readonly-server.ts` but uses HTTP transport instead
of stdio. Copy `readonly-server.ts` to `src/http-server.ts` and make these three changes:

**1. Replace the transport imports:**

```typescript
// Remove this:
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Add these:
import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
```

**2. Replace the startup block at the bottom of the file:**

```typescript
// Remove this:
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("N-sight MCP Read-Only Server running on stdio");

// Replace with:
const PORT = parseInt(process.env.PORT ?? "3100", 10);

const app = express();

// Optional: bearer token authentication
// Set NSIGHT_MCP_BEARER_TOKEN in .env to require a token on all requests.
const bearerToken = process.env.NSIGHT_MCP_BEARER_TOKEN;
if (bearerToken) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${bearerToken}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}

// Mount the MCP server at /mcp
const mcpApp = createMcpExpressApp({ server });
app.use("/mcp", mcpApp);

app.listen(PORT, () => {
  console.error(`N-sight MCP HTTP Server running on port ${PORT}`);
  console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
  if (bearerToken) {
    console.error("Bearer token authentication: ENABLED");
  }
});
```

**3. Add the npm script** to `package.json`:

```json
"start:http": "node dist/http-server.js",
"dev:http": "tsx src/http-server.ts"
```

**4. Build:**

```bash
npm run build
```

### Add `NSIGHT_MCP_BEARER_TOKEN` to `.env`

```env
# Optional: protect the HTTP endpoint with a bearer token
# Copilot Studio will send this in the Authorization header
NSIGHT_MCP_BEARER_TOKEN=choose_a_long_random_string_here
```

Generate a strong token: any 32+ character random string works. Keep it in `.env` —
never commit it.

---

## Step 2 — Expose the Server Publicly

Copilot Studio is hosted in Microsoft's cloud. It cannot reach `localhost`. You need a
public HTTPS URL that forwards to `http://localhost:3100/mcp`.

### Option A — Dev / Testing: ngrok Tunnel

[ngrok](https://ngrok.com) creates a secure tunnel from a public URL to your local port.
Free tier is sufficient for testing.

```bash
# Install (one time)
winget install ngrok

# Authenticate (one time — get token at dashboard.ngrok.com)
ngrok config add-authtoken YOUR_NGROK_TOKEN

# Start the MCP HTTP server
npm run start:http

# In a second terminal — start the tunnel
ngrok http 3100
```

ngrok prints a URL like `https://abc123.ngrok-free.app`. Your MCP endpoint is:

```
https://abc123.ngrok-free.app/mcp
```

> **Note:** The free ngrok URL changes every time you restart the tunnel. For persistent
> testing, use a paid ngrok plan with a static domain, or use Cloudflare Tunnel (free,
> static subdomain).

### Option B — Dev / Testing: Cloudflare Tunnel (free, static URL)

```bash
# Install cloudflared
winget install Cloudflare.cloudflared

# Authenticate (one time)
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create nsight-mcp

# Start the MCP HTTP server
npm run start:http

# Run the tunnel (points to local port 3100)
cloudflared tunnel --url http://localhost:3100 run nsight-mcp
```

Your MCP endpoint will be something like `https://nsight-mcp.your-account.cfargotunnel.com/mcp`.
This URL is persistent across restarts.

### Option C — Production: Azure App Service

For a production deployment where the server runs permanently:

1. Create an Azure App Service (Node.js 18+ runtime)
2. Set environment variables in Azure Portal under **Settings > Configuration**:
   - `NSIGHT_API_KEY` = your N-sight API key
   - `NSIGHT_SERVER_URL` = your N-sight server URL
   - `NSIGHT_MCP_BEARER_TOKEN` = your bearer token
   - `PORT` = 8080 (Azure default)
3. Deploy the `dist/` folder and `package.json`
4. Your endpoint: `https://your-app.azurewebsites.net/mcp`

> For a production MSP deployment, Azure App Service is recommended. The server is
> stateless and read-only, so it scales easily and has no persistence requirements.

---

## Step 3 — Configure Copilot Studio

### Prerequisites
- A Microsoft Copilot Studio environment (Power Platform)
- An existing or new Copilot agent to add N-sight capabilities to

### Add the MCP Connection

1. Open [Copilot Studio](https://copilotstudio.microsoft.com)
2. Open your agent (or create a new one)
3. Go to **Actions** in the left navigation
4. Click **+ Add an action**
5. Select **Model Context Protocol (MCP)**
6. Enter your server URL:
   ```
   https://your-public-url/mcp
   ```
7. If you set a bearer token, select **Authentication > API Key** and enter:
   - Header name: `Authorization`
   - Value: `Bearer your_bearer_token_here`
8. Click **Connect** — Copilot Studio will fetch the tool list automatically
9. Select which tools to enable for the agent (start with the read-only set)
10. Click **Save**

### Recommended Tool Selection for a First Agent

Enable these tools for a general MSP health copilot:

| Tool | Why |
|---|---|
| `get_environment_summary` | Customer health overview in one call |
| `list_clients` | Foundation — resolves client names to IDs |
| `list_failing_checks` | "What's alerting right now?" |
| `list_sites` | Site listing for a client |
| `list_devices` | Devices at a site |
| `list_patches` | Patch status per device |

Hold back write tools (`approve_patch`, `run_task`, etc.) until the read-only agent
is validated. Add write tools in a separate agent with a more restricted scope.

### Example Agent Instructions

Add this to your agent's system prompt to guide how it uses the tools:

```
You are an N-sight RMM assistant for MSPs. You have access to tools that query
live data from N-sight. When a user asks about a customer, site, or device:

1. Use get_environment_summary first — it gives a full health overview in one call.
2. Use list_clients to resolve customer names to IDs when needed.
3. Always confirm the customer name before calling any scoped tool.
4. Never call list_software, list_hardware, or list_device_asset_details across
   multiple devices — always ask the user to specify a single device first.
5. Summarise results clearly — don't dump raw JSON at the user.
```

---

## Step 4 — Test the Connection

Before configuring Copilot Studio, verify your HTTP server and tunnel are working
with a direct curl test:

```bash
# Test without auth (should return tool list)
curl https://your-public-url/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test with bearer auth
curl https://your-public-url/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_bearer_token_here" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

A successful response returns the 23-tool list (or 36 for the production server).
If you get a 401, the bearer token is wrong. If you get no response, the tunnel is
not running or the server is not started.

---

## Architecture Reference

```
Developer Machine (local)          Microsoft Cloud
─────────────────────────          ─────────────────
.env (credentials)                 Copilot Studio Agent
    │                                      │
    ▼                                      │ HTTPS + Bearer token
http-server.ts                            │
  ├── same 23 read-only tools             ▼
  ├── StreamableHTTP transport   ◄── ngrok / Cloudflare / Azure
  └── Bearer token middleware
         │
         ▼
   N-sight API
   (your environment)
```

---

## File Summary

| File | Purpose |
|---|---|
| `src/http-server.ts` | New entry point — same tools, HTTP transport |
| `dist/http-server.js` | Compiled output (after `npm run build`) |
| `.env` | Holds `NSIGHT_MCP_BEARER_TOKEN` alongside existing vars |

The existing `readonly-server.ts` and `production-server.ts` (stdio) are unchanged.
Both transports can run simultaneously — stdio for Claude Desktop, HTTP for Copilot Studio.

---

## Security Notes

- Always use `NSIGHT_MCP_BEARER_TOKEN` in any internet-facing deployment
- Use HTTPS only (ngrok and Cloudflare Tunnel provide this automatically; Azure requires HTTPS configuration)
- The HTTP server inherits all the same guardrails as the stdio server: rate limiter, SessionGuard, scope constraints
- For production, restrict the Azure App Service to known IP ranges (Power Platform egress IPs) using Azure firewall rules
- The `.env` file is gitignored — never commit credentials

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Copilot Studio can't connect | Tunnel not running or server not started | Start `npm run start:http` then the tunnel |
| 401 Unauthorized | Bearer token mismatch | Check `NSIGHT_MCP_BEARER_TOKEN` in `.env` matches what Copilot Studio sends |
| Tool calls return no data | N-sight API key wrong or expired | Test with `node test-notifications.mjs` locally first |
| ngrok URL changed | Free ngrok URLs are ephemeral | Use Cloudflare Tunnel (persistent) or paid ngrok |
| Rate limit errors | Too many tool calls | Copilot Studio conversation looping — tighten agent instructions |

---

*Last updated: 2026-06-09*
