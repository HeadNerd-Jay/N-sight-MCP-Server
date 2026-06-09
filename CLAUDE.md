# N-sight MCP Server — Claude Code Memory

## Project Overview
**N-sight AI Connect** — Official first-party MCP (Model Context Protocol) server for N-able N-sight RMM.
Lets AI assistants (Claude, Microsoft Copilot, etc.) interact with N-sight directly via natural language.

- **Repo:** `HeadNerd-Jay/N-sight-MCP-Server` (private, work account)
- **Local path:** `C:\Users\jason.murphy\OneDrive - N-Able, Inc\7. Claude\nsight-mcp-server`
- **Status:** POC / active development — being handed off to N-able engineering team
- **Brief:** `N-able_MCP_Server_Build_Brief.docx` (in Jason's OneDrive Claude Cowork folder)
- **Product name:** N-sight AI Connect
- **N-central:** Separate follow-on project — not in scope here

---

## Two-Tier Architecture

| Server | Description | Entry Point | Registered As | Status |
|---|---|---|---|---|
| **Read-Only** | Safe read tools, broad rollout | `dist/readonly-server.js` | `nsight` + `nsight-readonly` | Complete |
| **Production** | Read + write/action tools, opt-in | `dist/production-server.js` | `nsight-production` | Complete |

Both share the same core (`src/core/`), auth layer, and XML to JSON transformation.

**IMPORTANT:** Changes to read-only tools must be mirrored in production-server.ts. Always sync both servers.

### Local MCP Registration
Both servers are registered in two claude_desktop_config.json locations (must stay in sync):
- `C:\Users\jason.murphy\AppData\Roaming\Claude\claude_desktop_config.json`
- `C:\Users\jason.murphy\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`

**After any source change:** run `npm run build` before restarting Claude. Changes DO NOT take effect until compiled.

---

## Tech Stack
- **Language:** TypeScript (ES2022, NodeNext modules)
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.x
- **XML parsing:** `xml2js`
- **Config:** `dotenv`
- **Test:** `vitest`
- **Dev runner:** `tsx` (no compile step in dev mode)
- **Node:** >=18 required

---

## Project Structure

```
src/
├── core/
│   ├── client.ts          # NsightClient — HTTP calls, XML to JSON, rate limiting
│   ├── ratelimit.ts       # Token bucket rate limiter (max 60 calls/min)
│   ├── session-guard.ts   # In-flight blocking + 30s cooldown (anti-loop guard)
│   └── audit.ts           # Audit logging (Production server)
├── tools/
│   ├── readonly/          # 23 read-only tool implementations
│   └── production/        # 13 write/action tool implementations
├── readonly-server.ts     # MCP server entry point — read-only (23 tools)
└── production-server.ts   # MCP server entry point — production (36 tools)
dist/                      # Compiled JS output — this is what Claude runs
tests/                     # Unit tests for core (vitest)
device_details_reports/    # Generated JSON report examples
TOOL-REFERENCE.md          # Complete tool reference with keywords and triggers
mcp-terminal.mjs           # Interactive terminal client with live notifications
test-notifications.mjs     # Automated notification test (non-interactive)
test-commands.mjs          # Full test suite — 23/23 tools verified PASS
start-readonly.cmd         # Batch launcher for read-only server (sets env vars)
```

---

## Guardrails & Anti-Abuse Measures

### Rate Limiter (`src/core/ratelimit.ts`)
Token bucket — max 60 API calls per minute. Applies to both servers.

### SessionGuard (`src/core/session-guard.ts`)
Prevents LLM looping across multiple devices for per-device tools.
- Sets `inFlight: true` synchronously before any `await` — blocks parallel calls
- 30-second cooldown after `complete()` is called in the `finally` block
- Applied to: `list_software`, `list_hardware`, `list_device_asset_details`

### Tool Description Language
Description strings contain "SINGLE DEVICE ONLY. Do NOT call in a loop..." to guide LLM behaviour.

### Scope Constraints
| Tool | Constraint |
|---|---|
| `list_software` | Single device only. Requires `device_name`. SessionGuard blocks looping. |
| `list_hardware` | Single device only. Requires `device_name`. SessionGuard blocks looping. |
| `list_device_asset_details` | Single device only. Requires `device_name`. SessionGuard blocks looping. |
| `get_environment_summary` | Single customer per call. Requires `client_name` or `site_names`. Multi-customer rejected. |
| `list_devices` | Requires `client_name` OR `site_name` as context (not both required). |
| `list_all_devices` | Deprecated and removed. Too broad for large MSP accounts. |

---

## Tool Implementation Pattern

Every tool follows the same structure — always match this pattern when adding new tools:

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
3. Mirror the change in `production-server.ts`
4. Run `npm run build`

---

## Response Field Names (confirmed against live API)

| Object | Fields |
|---|---|
| Client | `client_id`, `name`, `dashboard_username` |
| Site | `site_id`, `name` |
| Device | `device_id`, `device_type`, `name`, `asset_id`, `online`, `ip_address`, `os_version`, ... |
| Hardware response | `device_name`, `asset_id`, `total_items`, `hardware[]` |
| Software response | `device_name`, `asset_id`, `total_items`, `software[]` |
| Failing checks | `total_failures`, `failures[]` |
| Checks | `device_id`, `total_checks`, `checks[]` |
| Env summary | `client_id`, `client_name`, `total_sites`, `total_devices`, `online_devices`, `offline_devices`, `total_failing_checks`, `sites[]` |

---

## N-sight API

- **Pattern:** `https://{SERVER}/api/?apikey={key}&service={service}&param={value}`
- **Auth:** API key as URL query param — stored server-side, never exposed to AI
- **Response:** Always XML — `NsightClient` transforms to JSON automatically
- **Rate limit:** Max 60 calls/min — handled by `RateLimiter` in `core/ratelimit.ts`
- **Region URLs:** NA = `www.systemmonitor.us`, EU = `www.systemmonitor.eu`, APAC = `wwwasia.systemmonitor.us`
- **Jason's test env:** `https://www.am.remote.management`

### Tool to API Service Mapping (Read-Only)

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

---

## Development Commands

```bash
npm run build                  # compile TypeScript to dist/ (REQUIRED after source changes)
npm run dev:readonly           # run read-only server via tsx (no build needed)
npm run dev:production         # run production server via tsx (no build needed)
npm run start:readonly         # run compiled read-only server
npm run start:production       # run compiled production server
npm run test                   # run vitest test suite
npm run typecheck              # TypeScript check without emit
node mcp-terminal.mjs          # interactive terminal client with live notifications
node test-notifications.mjs    # automated notification test (non-interactive)
node test-commands.mjs         # full tool test suite — chains all 23 tools, reports PASS/FAIL
start-readonly.cmd             # Windows batch launcher (sets env vars, runs compiled server)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NSIGHT_API_KEY` | Yes | N-sight API key (Settings > General Settings > API) |
| `NSIGHT_SERVER_URL` | Yes | Regional server URL |
| `NSIGHT_CLIENT_ID` | Optional | Restrict to a specific client group |
| `NSIGHT_RATE_LIMIT_PER_MIN` | Optional | Override rate limit (max 60) |
| `NSIGHT_MAX_WRITES_PER_SESSION` | Production only | Max write actions per session |
| `NSIGHT_AUDIT_LOG_ENABLED` | Production only | Enable audit logging |
| `NSIGHT_AUDIT_LOG_PATH` | Production only | Path for audit log file |

---

## Key Rules & Constraints

- **Never expose the API key** to the AI client — always server-side only
- **Always handle single vs array** — N-sight returns a single object when there is one result, array when multiple. Pattern: `const items = Array.isArray(raw) ? raw : raw ? [raw] : []`
- **Production tools require confirmation** before every write/action — mandatory, not optional
- **Production tools require audit logging** — log before execution, not after
- **`list_clients` is the foundation tool** — most other tools need a `client_id` from it
- **N-central is out of scope** — separate project, separate brief
- **Both servers must stay in sync** — read-only tool changes go in both `readonly-server.ts` and `production-server.ts`
- **`npm run build` is required** — Claude runs from `dist/`, source changes have no effect until compiled

---

## Stakeholders (from build brief)
- **Jason Murphy** — Product, driving the build
- **Marc-Andre, Laura, Paul Kelly** — Stakeholders to align (per brief Section 12)
- **N-sight engineering lead** — Squad lead for handoff
- **Engineering team** — Taking this over after POC is validated

---

## Current Build Status

### Done
- Core infrastructure (`client.ts`, `ratelimit.ts`, `audit.ts`, `session-guard.ts`)
- All 23 read-only tools implemented, registered, and verified (23/23 PASS in test-commands.mjs)
- All 13 production write tools implemented in `production-server.ts`
- SessionGuard anti-loop protection on `list_software`, `list_hardware`, `list_device_asset_details`
- Scope constraints on `list_devices` and `get_environment_summary`
- `list_all_devices` deprecated and removed
- `TOOL-REFERENCE.md` — complete keyword/trigger reference for all 36 tools
- `mcp-terminal.mjs` — interactive terminal REPL with live log/progress notifications
- `test-notifications.mjs` — automated notification test script
- `test-commands.mjs` — full automated test suite (23/23 PASS, confirmed 2026-06-09)
- Both servers registered in local claude_desktop_config.json

### Production Tools (Phase 2) — Implemented, needs validation
`clear_check`, `add_check_note`, `approve_patch`, `ignore_patch`, `retry_patch`,
`start_av_scan`, `cancel_av_scan`, `release_quarantine_item`, `remove_quarantine_item`,
`update_av_definitions`, `run_task`, `add_client`, `add_site`

### Still Needed
- Copilot Studio integration guide
- Developer quick-start guide additions for write operations
- Unit tests for production write tools
- End-to-end validation of production write tools against live environment
