# N-sight AI Connect

Official MCP (Model Context Protocol) server for N-able N-sight RMM.

Enables AI assistants (Claude, Microsoft Copilot, and any MCP-compatible client) to query and act on N-sight RMM on behalf of MSP technicians — without leaving their AI interface.

---

## Quick Start

```bash
npm install -g nsight-mcp-server
```

Then add it to your AI client config (see [Integration](#integration) below).

> New to MCP servers? See the **[Usage Guide](USAGE_GUIDE.md)** for step-by-step setup instructions, example prompts, and troubleshooting — written for non-developers.

---

## Architecture

Two servers, one package:

| Server | Command | What it does |
|---|---|---|
| **Read-Only** | `nsight-mcp-readonly` | Safe data access — clients, devices, checks, patches, AV, backups. No writes. |
| **Production** | `nsight-mcp-production` | Everything in Read-Only plus remediation actions (clear checks, approve patches, run tasks, and more). |

Both servers share the same API client, rate limiter, and XML-to-JSON transformation layer.

---

## Prerequisites

- Node.js 18 or later
- N-sight API key (Settings > General Settings > API Keys)
- Your regional server URL (see [Regional URLs](#regional-urls))

---

## Integration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Read-Only server:**
```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-server", "readonly"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

**Production server:**
```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-server", "production"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us",
        "NSIGHT_MAX_WRITES_PER_SESSION": "20",
        "NSIGHT_AUDIT_LOG_PATH": "./logs/audit.log"
      }
    }
  }
}
```

### Microsoft Copilot Studio

In your Copilot Studio agent, add a new MCP connection:

- **Server type:** stdio
- **Command:** `npx nsight-mcp-readonly` (or `nsight-mcp-production`)
- **Environment variables:** `NSIGHT_API_KEY`, `NSIGHT_SERVER_URL`

### Any MCP-compatible client

Both servers speak the standard MCP stdio transport. Point your client at:

```
npx nsight-mcp-readonly
```
or
```
npx nsight-mcp-production
```

---

## Regional URLs

| Region | URL |
|---|---|
| North America | `https://www.systemmonitor.us` |
| Europe | `https://www.systemmonitor.eu` |
| Asia Pacific | `https://wwwasia.systemmonitor.us` |

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` for local development.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NSIGHT_API_KEY` | Yes | | N-sight API key |
| `NSIGHT_SERVER_URL` | Yes | | Regional server URL (see above) |
| `NSIGHT_CLIENT_ID` | No | | Restrict to a specific client group |
| `NSIGHT_RATE_LIMIT_PER_MIN` | No | `60` | API call rate limit (max 60) |
| `NSIGHT_MAX_WRITES_PER_SESSION` | Production only | `20` | Max write actions before server requires restart |
| `NSIGHT_AUDIT_LOG_ENABLED` | Production only | `true` | Enable append-only audit log |
| `NSIGHT_AUDIT_LOG_PATH` | Production only | `./logs/audit.log` | Path for audit log file |

---

## Available Tools

### Read-Only (21 tools)

| Tool | Description |
|---|---|
| `list_clients` | List all managed clients with IDs |
| `list_sites` | Sites for a client |
| `list_devices` | Servers and workstations at a site |
| `list_failing_checks` | All failing monitors, filterable by client |
| `list_checks` | All monitoring checks configured on a device |
| `list_outages` | Open and closed device outages |
| `get_check_output` | Detailed check logs and results |
| `list_patches` | Patch compliance per device |
| `list_av_threats` | Active AV threats |
| `list_av_scans` | Managed Antivirus scan history |
| `list_av_quarantine` | Managed Antivirus quarantined files |
| `list_backup_sessions` | Backup job history and session details |
| `list_backup_history` | 90-day daily backup history |
| `list_ad_users` | Synchronized Active Directory users |
| `list_hardware` | System hardware profile telemetry |
| `list_software` | Registry-installed application inventory |
| `list_drive_history` | Drive size and free space history |
| `list_performance_history` | Processor, RAM, and bandwidth history |
| `list_client_license_count` | Client software license allocations |
| `list_device_asset_details` | Unified device hardware/software specifications |
| `get_device_assets` | Asset records for a specific device |

### Production (13 additional write tools)

All write tools require `confirm: true` before executing. Unconfirmed calls return a preview of the action without executing it.

| Tool | Description |
|---|---|
| `clear_check` | Clear (acknowledge) a failing monitor check |
| `add_check_note` | Add a note to a monitor check |
| `approve_patch` | Approve a pending patch for installation |
| `ignore_patch` | Mark a patch as ignored on a device |
| `retry_patch` | Retry a failed patch installation |
| `start_av_scan` | Trigger an on-demand AV scan (QUICK or FULL) |
| `cancel_av_scan` | Cancel an in-progress AV scan |
| `update_av_definitions` | Force an immediate AV definition update |
| `release_quarantine_item` | Restore a quarantined file to its original location |
| `remove_quarantine_item` | Permanently delete a quarantined file |
| `run_task` | Run a scheduled automation task immediately |
| `add_client` | Create a new managed client |
| `add_site` | Create a new site under an existing client |

---

## Production Server: Safety Controls

The Production server has three layers of protection against unintended writes:

**1. Confirmation gate**
Every write tool requires `confirm: true` in the tool call. Without it, the tool returns a preview of what would happen and does nothing.

**2. Audit log**
Every confirmed write is appended to an audit log before it executes. The log records the action, parameters, operator identity, and timestamp. If the API call fails after the audit entry is written, the entry remains — giving you a full record of intent.

**3. Session write cap**
`NSIGHT_MAX_WRITES_PER_SESSION` (default: 20) limits the total number of confirmed write actions per server instance. Once reached, all further writes are blocked until the server is restarted. Prevents runaway automation.

---

## Project Structure

```
src/
├── core/
│   ├── client.ts          # N-sight API client (HTTP, XML-to-JSON, rate limiting)
│   ├── ratelimit.ts       # Token bucket rate limiter
│   ├── audit.ts           # Append-only audit logger
│   └── mcp-context.ts     # Per-request logging and progress notifications
├── tools/
│   ├── readonly/          # 21 read-only tool implementations
│   └── production/        # 13 write tool implementations
├── readonly-server.ts     # Read-Only MCP server entry point
└── production-server.ts   # Production MCP server entry point
```

---

## Development

```bash
git clone https://github.com/HeadNerd-Jay/N-sight-MCP-Server.git
cd nsight-mcp-server
npm install
cp .env.example .env       # fill in NSIGHT_API_KEY and NSIGHT_SERVER_URL

npm run dev:readonly       # run read-only server (no compile step)
npm run dev:production     # run production server
npm run test               # run test suite (96 tests)
npm run typecheck          # TypeScript check without emit
npm run build              # compile to dist/
```

---

## N-sight API

Built on the [N-sight Data Extraction API](https://developer.n-able.com/n-sight/docs/getting-started-with-the-n-sight-api).

- **Auth:** API key passed per request, stored server-side and never exposed to AI clients
- **Rate limit:** 60 calls/minute, queued and throttled automatically
- **Format:** N-sight returns XML; this server transforms all responses to clean JSON

---

## License

Copyright 2024 N-able Technologies

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
