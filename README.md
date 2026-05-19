# N-sight AI Connect

Official MCP (Model Context Protocol) server for N-able N-sight RMM.

Enables AI assistants (Claude, Microsoft Copilot, and any MCP-compatible client) to query and act on N-sight RMM on behalf of MSP technicians — without leaving their AI interface.

---

## Architecture

Two servers, shared codebase:

| Server | What it does | Status |
|---|---|---|
| **Read-Only** | Safe data access — clients, devices, checks, patches, AV, backups | Phase 1 — Complete ✅ |
| **Production** | Everything in Read-Only + remediation actions | Phase 2 — Planned |

---

## Quick Start

**Prerequisites:** Node.js 18+, N-sight API key, your regional server URL

```bash
cp .env.example .env      # add your NSIGHT_API_KEY and NSIGHT_SERVER_URL
npm install
npm run dev:readonly      # development (no compile step)
npm run start:readonly    # production (runs from dist/)
```

> See `.env.example` for all configuration options.

---

## Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nsight-readonly": {
      "command": "node",
      "args": ["/path/to/nsight-mcp-server/dist/readonly-server.js"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

**Regional server URLs:**
- North America: `https://www.systemmonitor.us`
- Europe: `https://www.systemmonitor.eu`
- Asia Pacific: `https://wwwasia.systemmonitor.us`

---

## Available Tools

### Read-Only (Phase 1)

| Tool | What it does |
|---|---|
| `list_clients` | List all managed clients with IDs ✅ |
| `list_failing_checks` | All failing monitors, filterable by client ✅ |
| `list_sites` | Sites for a client ✅ |
| `list_devices` | Servers and workstations ✅ |
| `list_patches` | Patch compliance per device ✅ |
| `list_av_threats` | Active AV threats ✅ |
| `list_av_scans` | Managed Antivirus scan logs ✅ |
| `list_av_quarantine` | Managed Antivirus quarantined files ✅ |
| `list_backup_sessions` | Backup job history and session details ✅ |
| `list_backup_history` | 90-day daily backup history ✅ |
| `list_checks` | Active monitoring checks configure per device ✅ |
| `list_outages` | Open and closed device outages ✅ |
| `get_check_output` | Detailed check logs and results ✅ |
| `list_ad_users` | Synchronized Active Directory users ✅ |
| `list_hardware` | System hardware profile telemetry ✅ |
| `list_software` | Registry-installed application inventory ✅ |
| `list_drive_history` | Drive size and free space history ✅ |
| `list_performance_history` | Processor, RAM, bandwidth history ✅ |
| `list_client_license_count` | Client software license allocations ✅ |
| `list_device_asset_details` | Unified device hardware/software specifications ✅ |

### Production (Phase 2)

Includes all Read-Only tools plus: `clear_check`, `approve_patch`, `run_task`, `start_av_scan`, `add_client`, and more.

> The Production server requires explicit opt-in and a confirmation step before every write action.

---

## Project Structure

```
src/
├── core/
│   ├── client.ts          # N-sight API client — HTTP, XML→JSON, rate limiting
│   ├── ratelimit.ts       # Token bucket rate limiter (60 calls/min)
│   └── audit.ts           # Audit logger (Production server only)
├── tools/
│   ├── readonly/          # Read-only tool implementations
│   └── production/        # Write/action tools (Phase 2)
├── readonly-server.ts     # Read-Only MCP server entry point
└── production-server.ts   # Production MCP server entry point (Phase 2)
```

---

## N-sight API

Built on the [N-sight Data Extraction API](https://developer.n-able.com/n-sight/docs/getting-started-with-the-n-sight-api).

- **Auth:** API key passed per request — stored server-side, never exposed to AI clients
- **Rate limit:** 60 calls/minute — queued and throttled automatically
- **Format:** N-sight returns XML; this server transforms all responses to clean JSON

---

## Roadmap

- [x] Core infrastructure (API client, rate limiter, audit logger)
- [x] `list_clients` — POC tool
- [x] `list_failing_checks`
- [x] Phase 1 — remaining read-only (all 21 tools) ✅ Complete
- [ ] Phase 2 — production write/action tools (~13 tools)
- [ ] Phase 3 — GA launch, MCP registry listing, Copilot Studio guide
- [ ] Future — N-central MCP server (separate project)

---

## Security

- API key stored server-side only — never sent to or seen by AI clients
- Production server enforces a confirmation step before every write action
- Full audit trail on all write calls: operator, device, action, timestamp
- Per-session write-action cap to prevent runaway automation
- API key scoping to a specific client group (required for Production)

---

## License

Copyright © N-able Technologies. All rights reserved.
