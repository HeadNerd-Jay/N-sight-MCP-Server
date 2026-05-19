# nsight-mcp-server

**N-sight AI Connect** — Official MCP (Model Context Protocol) server for N-able N-sight RMM.

Enables AI assistants (Claude, Microsoft Copilot, and any MCP-compatible client) to interact natively with N-sight RMM on behalf of MSP technicians.

---

## Two-Tier Architecture

| Server | Description | Phase |
|--------|-------------|-------|
| **Read-Only** | Safe data access and reporting — all read tools, no state changes | Phase 1 |
| **Production** | Full AI-driven operations including remediation actions | Phase 2 |

---

## Features

### Read-Only Server
- List and inspect clients, sites, servers, workstations, and agentless assets
- Query failing checks, outages, and check output
- Review patch compliance per device
- Monitor AV threats, scans, and quarantine status
- Check backup session history and selection sizes
- Retrieve hardware/software asset inventory
- View performance and drive space history

### Production Server *(Read-Only + all of the following)*
- Clear failing checks and add technician notes
- Approve, ignore, retry, and reprocess patches
- Start, pause, resume, and cancel AV scans
- Release or remove quarantined items
- Force AV definition updates
- Run pre-configured automated tasks
- Add clients and sites

---

## Getting Started

### Prerequisites
- Node.js 18+
- N-sight account with API key ([generate here](https://developer.n-able.com/n-sight/docs/generate-an-api-key))
- Your N-sight regional server URL ([determine here](https://developer.n-able.com/n-sight/docs/determine-server-for-api-query))

### Configuration

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your API key and server URL.

### Run Read-Only Server

```powershell
npm install
npm run start:readonly
```

### Run Production Server

```powershell
npm run start:production
```

> ⚠️ The Production server requires explicit opt-in and enforces a confirmation step before every write action.

---

## Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nsight-readonly": {
      "command": "node",
      "args": ["path/to/nsight-mcp-server/dist/readonly-server.js"],
      "env": {
        "NSIGHT_API_KEY": "your_key",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

---

## N-sight API

Built on the [N-sight Data Extraction API](https://developer.n-able.com/n-sight/docs/getting-started-with-the-n-sight-api).

- **Auth:** API key per account (stored server-side — never exposed to AI clients)
- **Rate limit:** 60 calls/minute — handled automatically with request queuing
- **Response format:** N-sight returns XML; this server transforms all responses to JSON

---

## Project Structure

```
nsight-mcp-server/
├── src/
│   ├── core/
│   │   ├── client.ts          # N-sight API HTTP client
│   │   ├── auth.ts            # API key management
│   │   ├── transform.ts       # XML → JSON transformation
│   │   ├── ratelimit.ts       # 60/min queue & throttle
│   │   └── audit.ts           # Production audit logger
│   ├── tools/
│   │   ├── readonly/          # Read-only tool implementations
│   │   └── production/        # Write/action tool implementations
│   ├── readonly-server.ts     # Read-Only MCP server entry point
│   └── production-server.ts   # Production MCP server entry point
├── tests/
├── docs/
│   ├── tools-readonly.md
│   ├── tools-production.md
│   └── copilot-studio.md
└── .env.example
```

---

## Roadmap

- [ ] Phase 1 — Read-Only Server (N-sight)
- [ ] Phase 2 — Production Server (N-sight)
- [ ] Phase 3 — GA launch, MCP registry listing
- [ ] Future — N-central MCP Server (separate project)

---

## Security

The Production server includes:
- Mandatory confirmation step before every write/action
- Full audit trail (operator, device, action, timestamp)
- Per-session write-action rate cap
- API key scoped to client group (required, not optional)

---

## License

Copyright © N-able Technologies. All rights reserved.
