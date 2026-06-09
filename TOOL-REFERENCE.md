# N-sight AI Connect — Tool Reference Guide

Complete reference for all MCP tools available in the N-sight AI Connect server.
Covers both the **Read-Only** and **Production** servers, including terminal keywords
and natural language triggers for each tool.

---

## Servers

| Server Name | Entry Point | Tools | Use Case |
|---|---|---|---|
| `nsight` (Read-Only) | `dist/readonly-server.js` | 23 tools | Safe, broad rollout — no write access |
| `nsight-production` (Production) | `dist/production-server.js` | 36 tools | Full access including write/action tools |

---

## Running the Interactive Terminal Client

```powershell
cd "C:\Users\jason.murphy\OneDrive - N-Able, Inc\7. Claude\nsight-mcp-server"
node mcp-terminal.mjs
```

Shows all MCP log and progress notifications in real time as tools execute.

---

## Read-Only Tools (23 total)

### Clients & Sites

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_clients` | `clients` | "list my clients", "show all customers" |
| `list_sites` | `sites <clientid>` | "list sites for Company 1" |
| `list_all_sites` | `call list_all_sites` | "show all sites everywhere" |
| `get_environment_summary` | `summary <customer name>` | "health overview for Kelltic", "how is Company 1 doing", "environment summary" |

### Devices

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_devices` | `devices <siteid>` | "show devices at Cork", "what's at C1 Site 1" |
| `get_device_assets` | `call get_device_assets {"clientid":0,"devicetype":"server","deviceid":0}` | "get asset info for device" |
| `list_device_asset_details` | `call list_device_asset_details {"device_name":"CSP-0009","deviceid":0}` | "full asset details for CSP-0009" |

### Monitoring & Checks

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_checks` | `call list_checks {"deviceid":0}` | "show monitoring checks for device" |
| `list_failing_checks` | `failing` | "what's failing", "show alerts", "any issues?" |
| `get_check_output` | `call get_check_output {"checkid":0}` | "what did check 123 return", "check output" |
| `list_outages` | `call list_outages {"deviceid":0}` | "show outages for device" |

### Patch Management

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_patches` | `call list_patches {"deviceid":0}` | "what patches are needed", "patch status for device" |

### Antivirus

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_av_threats` | `call list_av_threats {"deviceid":0}` | "any virus threats", "AV threats on device" |
| `list_av_scans` | `call list_av_scans {"deviceid":0}` | "show AV scan history" |
| `list_av_quarantine` | `call list_av_quarantine {"deviceid":0}` | "what's in quarantine" |

### Hardware & Software

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_hardware` | `hardware <device_name> <assetid>` | "show hardware for CSP-0009", "what CPU does CSP-0009 have" |
| `list_software` | `software <device_name> <assetid>` | "what software is on CSP-0009", "installed apps on device" |

### Backup

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_backup_sessions` | `call list_backup_sessions {"deviceid":0}` | "show backup sessions for device" |
| `list_backup_history` | `call list_backup_history {"deviceid":0}` | "backup history for device" |

### Performance & Storage

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_performance_history` | `call list_performance_history {"deviceid":0}` | "performance history for device", "CPU/memory trends" |
| `list_drive_history` | `call list_drive_history {"deviceid":0,"interval":"DAY"}` | "drive health history", "disk usage over time" |

### Active Directory & Licensing

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `list_ad_users` | `call list_ad_users {"siteid":0}` | "show AD users at site", "active directory users" |
| `list_client_license_count` | `call list_client_license_count {"clientid":0}` | "how many licenses for client", "license count" |

---

## Production-Only Write Tools (13 additional)

> All write tools require `"confirm": true` in the arguments or they return
> `status: "pending_confirmation"` without executing anything.

### Monitoring

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `clear_check` | `call clear_check {"check_id":0,"device_id":0,"confirm":true}` | "clear check 123", "reset that alert" |
| `add_check_note` | `call add_check_note {"check_id":0,"note":"text","confirm":true}` | "add a note to check 123" |

### Patch Management

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `approve_patch` | `call approve_patch {"device_id":0,"patch_id":0,"confirm":true}` | "approve patch for device" |
| `ignore_patch` | `call ignore_patch {"device_id":0,"patch_id":0,"confirm":true}` | "ignore that patch", "suppress patch" |
| `retry_patch` | `call retry_patch {"device_id":0,"patch_id":0,"confirm":true}` | "retry failed patch" |

### Antivirus

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `start_av_scan` | `call start_av_scan {"device_id":0,"scan_type":"QUICK","confirm":true}` | "run AV scan on device", "scan for viruses" |
| `cancel_av_scan` | `call cancel_av_scan {"device_id":0,"confirm":true}` | "stop the AV scan" |
| `update_av_definitions` | `call update_av_definitions {"device_id":0,"confirm":true}` | "update AV definitions" |
| `release_quarantine_item` | `call release_quarantine_item {"device_id":0,"quarantine_id":0,"confirm":true}` | "release item from quarantine" |
| `remove_quarantine_item` | `call remove_quarantine_item {"device_id":0,"quarantine_id":0,"confirm":true}` | "delete quarantined item" |

### Tasks

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `run_task` | `call run_task {"device_id":0,"task_id":0,"confirm":true}` | "run task on device" |

### Client & Site Management

| Tool | Terminal Keyword | Natural Language Triggers |
|---|---|---|
| `add_client` | `call add_client {"name":"Client Name","confirm":true}` | "create new client", "add customer" |
| `add_site` | `call add_site {"client_id":0,"name":"Site Name","confirm":true}` | "add a new site", "create site for client" |

---

## Guardrails & Constraints

The following tools have server-side guardrails to prevent unsafe usage at scale:

| Tool | Constraint |
|---|---|
| `list_software` | Single device only. Requires `device_name`. SessionGuard blocks looping (30s cooldown). |
| `list_hardware` | Single device only. Requires `device_name`. SessionGuard blocks looping (30s cooldown). |
| `list_device_asset_details` | Single device only. Requires `device_name`. SessionGuard blocks looping (30s cooldown). |
| `get_environment_summary` | Single customer only per call. Requires `client_name` or `site_names`. Multi-customer calls rejected. |
| `list_devices` | Requires `client_name` or `site_name` as context before calling. |
| `list_all_devices` | **Deprecated and removed.** Too broad — risk of rate limit exhaustion on large accounts. |

---

## Recommended ID Resolution Workflow

Most tools require IDs. Follow this chain to resolve them:

```
1. clients                        → get client IDs
2. sites <clientid>               → get site IDs
3. devices <siteid>               → get device IDs + asset IDs
4. hardware / software / etc.     → use device_name + asset ID
```

---

## Development Commands

```bash
npm run build                  # compile TypeScript to dist/ (required after any source change)
npm run dev:readonly           # run read-only server via tsx (no build needed)
npm run dev:production         # run production server via tsx (no build needed)
npm run start:readonly         # run compiled read-only server
npm run start:production       # run compiled production server
npm run test                   # run vitest test suite
npm run typecheck              # TypeScript check without emit
node mcp-terminal.mjs          # interactive terminal client with live notifications
node test-notifications.mjs    # automated notification test (non-interactive)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NSIGHT_API_KEY` | ✅ | N-sight API key (Settings > General Settings > API) |
| `NSIGHT_SERVER_URL` | ✅ | Regional server URL (NA: `www.systemmonitor.us`, EU: `www.systemmonitor.eu`) |
| `NSIGHT_CLIENT_ID` | Optional | Restrict scope to a specific client group |
| `NSIGHT_RATE_LIMIT_PER_MIN` | Optional | Override rate limit (max 60) |
| `NSIGHT_MAX_WRITES_PER_SESSION` | Production only | Max write actions per session (default: 20) |
| `NSIGHT_AUDIT_LOG_ENABLED` | Production only | Enable audit logging (`true`/`false`) |
| `NSIGHT_AUDIT_LOG_PATH` | Production only | Path for audit log file |

---

*Last updated: 2026-06-09*
