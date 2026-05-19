# N-sight MCP Server — Claude Code Memory

## Project Overview
**N-sight AI Connect** — Official first-party MCP (Model Context Protocol) server for N-able N-sight RMM.
Lets AI assistants (Claude, Microsoft Copilot, etc.) interact with N-sight directly via natural language.

- **Repo:** `HeadNerd-Jay/N-sight-MCP-Server` (private, work account)
- **Status:** POC / active development — being handed off to N-able engineering team
- **Brief:** `N-able_MCP_Server_Build_Brief.docx` (in Jason's OneDrive Claude Cowork folder)
- **Product name:** N-sight AI Connect
- **N-central:** Separate follow-on project — not in scope here

---

## Two-Tier Architecture

| Server | Description | Entry Point | Status |
|---|---|---|---|
| **Read-Only** | Safe read tools, broad rollout | `src/readonly-server.ts` | 🟢 Complete |
| **Production** | Read + write/action tools, opt-in | `src/production-server.ts` | ⬜ Phase 2 |

Both share the same core (`src/core/`), auth layer, and XML→JSON transformation.

---

## Tech Stack
- **Language:** TypeScript (ES2022, NodeNext modules)
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.x
- **XML parsing:** `xml2js`
- **Config:** `dotenv`
- **Test:** `vitest`
- **Dev runner:** `tsx` (no compile step needed in dev)
- **Node:** >=18 required

---

## Project Structure

```
src/
├── core/
│   ├── client.ts        # NsightClient — HTTP calls, XML→JSON, rate limiting
│   ├── ratelimit.ts     # Token bucket rate limiter (max 60 calls/min)
│   └── audit.ts         # Audit logging (Production server)
├── tools/
│   ├── readonly/        # Read-only tool implementations (all 21 built ✅)
│   └── production/      # Write/action tool implementations (Phase 2)
├── readonly-server.ts   # MCP server entry point — read-only ✅ built
└── production-server.ts # MCP server entry point — production (Phase 2)
tests/                   # Unit tests for core (vitest) ✅ built
device_details_reports/  # Generated JSON report examples for devices ✅ built
```

---

## Tool Implementation Pattern

Every tool follows the same structure — **always match this pattern** when adding new tools:

```typescript
// 1. Export a Tool object (the MCP schema shown to AI clients)
export const myTool: Tool = {
  name: "tool_name",
  description: "Clear description for the AI — what it does, when to use it.",
  inputSchema: {
    type: "object",
    properties: { /* args */ },
    required: [],
  },
};

// 2. Export an async function that takes NsightClient + args, returns string
export async function myToolFn(client: NsightClient, args: MyArgs): Promise<string> {
  const result = await client.call({ service: "nsight_service_name", ...args });
  // Parse result, handle single vs array responses, return JSON.stringify(...)
}
```

**After adding a tool:**
1. Add the `Tool` object to the `tools` array in `readonly-server.ts`
2. Add a `case` to the `switch` block in the `CallToolRequestSchema` handler

---

## N-sight API

- **Pattern:** `https://{SERVER}/api/?apikey={key}&service={service}&param={value}`
- **Auth:** API key as URL query param — stored server-side, never exposed to AI
- **Response:** Always XML — `NsightClient` transforms to JSON automatically
- **Rate limit:** Max 60 calls/min — handled by `RateLimiter` in `core/ratelimit.ts`
- **Region URLs:** NA = `www.systemmonitor.us`, EU = `www.systemmonitor.eu`, APAC = `wwwasia.systemmonitor.us`

### Tool → API Service Mapping (Read-Only)

| MCP Tool | N-sight Service |
|---|---|
| `list_clients` | `list_clients` |
| `list_sites` | `list_sites` |
| `list_devices` | `list_servers` + `list_workstations` |
| `list_failing_checks` | `list_failing_checks` |
| `list_checks` | `list_checks` |
| `list_outages` | `list_outages` |
| `list_patches` | `list_all_patches_for_device` |
| `list_av_threats` | `list_managed_antivirus` |
| `list_backup_sessions` | `list_backup_recovery_sessions` |
| `list_hardware` | `listing_hardware` |
| `list_software` | `listing_software` |

Full catalogue in the build brief (Section 7).

---

## Development Commands

```bash
cp .env.example .env          # configure API key + server URL first
npm install
npm run dev:readonly          # run read-only server (no compile needed)
npm run dev:production        # run production server
npm run build                 # compile TypeScript to dist/
npm run start:readonly        # run compiled read-only server
npm run test                  # run vitest test suite
npm run typecheck             # TypeScript check without emit
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NSIGHT_API_KEY` | ✅ | N-sight API key (Settings > General Settings > API) |
| `NSIGHT_SERVER_URL` | ✅ | Regional server URL |
| `NSIGHT_CLIENT_ID` | Optional | Restrict to a specific client group |
| `NSIGHT_RATE_LIMIT_PER_MIN` | Optional | Override rate limit (max 60) |
| `NSIGHT_MAX_WRITES_PER_SESSION` | Production only | Max write actions per session |
| `NSIGHT_AUDIT_LOG_ENABLED` | Production only | Enable audit logging |
| `NSIGHT_AUDIT_LOG_PATH` | Production only | Path for audit log file |

---

## Key Rules & Constraints

- **Never expose the API key** to the AI client — always server-side only
- **Always handle single vs array** — N-sight returns a single object when there's one result, array when multiple. Pattern: `const items = Array.isArray(raw) ? raw : raw ? [raw] : []`
- **Production tools require confirmation** before every write/action — mandatory, not optional
- **Production tools require audit logging** — log before execution, not after
- **`list_clients` is the foundation tool** — most other tools need a `clientid` from it
- **N-central is out of scope** — separate project, separate brief
- **No service lifecycle or script execution** — not in N-sight API, log as enhancement requests

---

## Stakeholders (from build brief)
- **Jason Murphy** — Product, driving the build
- **Marc-Andre, Laura, Paul Kelly** — Stakeholders to align (per brief Section 12)
- **N-sight engineering lead** — Squad lead for handoff
- **Engineering team** — Taking this over after POC is validated

---

## Current Build Status

### ✅ Done
- Core infrastructure (`client.ts`, `ratelimit.ts`, `audit.ts`)
- All 21 Read-Only tools implemented and registered in `readonly-server.ts` (Phase 1)
- `readonly-server.ts` — MCP server entry point wiring all 21 tools
- Unit tests for core client and rate limiter under `tests/`
- Device details dumps and indices under `device_details_reports/`

### 🔲 Read-Only Tools Remaining (Phase 0)
- None. Phase 1 is 100% complete and fully verified.

### 🔲 Production Tools (Phase 2)
`clear_check`, `add_check_note`, `approve_patch`, `ignore_patch`, `retry_patch`,
`start_av_scan`, `cancel_av_scan`, `release_quarantine_item`, `remove_quarantine_item`,
`update_av_definitions`, `run_task`, `add_client`, `add_site`

### 🔲 Still Needed (Phase 2)
- `production-server.ts` entry point
- Copilot Studio config guide
- Developer quick-start guide additions for write operations
- Unit tests for write operations
