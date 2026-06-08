# N-sight AI Connect: Usage Guide

This guide walks you through setting up and using the N-sight AI Connect MCP server — from zero to having a working AI assistant that can query and act on your N-sight RMM environment.

**No programming experience required.** If you can edit a JSON config file and run a command in a terminal, you can set this up in about 10 minutes.

---

## What Is This?

N-sight AI Connect is a bridge between your N-sight RMM environment and AI assistants like Claude or Microsoft Copilot. Once set up, you can ask your AI assistant questions like:

- *"Which of my clients have failing checks right now?"*
- *"Show me all devices at Contoso that are missing patches."*
- *"What AV threats were detected this week across all sites?"*
- *"Clear the failing disk check on server CONTOSO-DC01 and add a note that it's been investigated."*

The AI doesn't guess — it pulls live data directly from your N-sight account and responds with accurate, real-time information.

---

## Two Servers, Two Use Cases

| Server | Best for | What it can do |
|---|---|---|
| **Read-Only** | Day-to-day queries, dashboards, reporting | Read anything — clients, devices, checks, patches, AV, backups |
| **Production** | Remediation workflows | Everything in Read-Only, plus actions like clearing checks, approving patches, running tasks, and more |

**Start with Read-Only.** It is completely safe — it cannot change anything in your N-sight environment. Once you're comfortable, add the Production server for remediation.

---

## Before You Start

You need three things:

### 1. Node.js (version 18 or later)

Node.js is the runtime that powers the server. Check if you have it:

```
node --version
```

If you see `v18.x.x` or higher, you're good. If not, download it from [nodejs.org](https://nodejs.org) and install the LTS version.

### 2. Your N-sight API Key

1. Log in to your N-sight dashboard
2. Go to **Settings** (top right) > **General Settings**
3. Click the **API** tab
4. Copy your API key (or generate one if you haven't already)

Keep this key private. It grants access to your entire N-sight account.

### 3. Your Regional Server URL

Find your region below:

| Where your N-sight account is | URL to use |
|---|---|
| North America | `https://www.systemmonitor.us` |
| Europe | `https://www.systemmonitor.eu` |
| Asia Pacific | `https://wwwasia.systemmonitor.us` |

Not sure which region? Check the URL you use to log in to N-sight. It will contain `systemmonitor.us`, `systemmonitor.eu`, or `wwwasia`.

---

## Setup: Claude Desktop

Claude Desktop is the easiest way to get started. Download it from [claude.ai](https://claude.ai/download) if you don't have it.

### Step 1: Open the config file

**On Mac:**
Open Finder, press `Cmd + Shift + G`, and paste:
```
~/Library/Application Support/Claude/
```
Open the file named `claude_desktop_config.json`.

**On Windows:**
Press `Win + R`, type `%APPDATA%\Claude\`, press Enter.
Open the file named `claude_desktop_config.json`.

If the file doesn't exist yet, create it as a new text file with that exact name.

### Step 2: Add the server configuration

Paste the following into the file, replacing the placeholder values with your actual API key and server URL:

**Read-Only server (recommended starting point):**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-server", "readonly"],
      "env": {
        "NSIGHT_API_KEY": "paste-your-api-key-here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

**If you already have other MCP servers configured**, add the `nsight` block inside the existing `mcpServers` section — don't replace the whole file.

### Step 3: Save and restart Claude Desktop

Save the file, then fully quit and reopen Claude Desktop (don't just close the window).

### Step 4: Verify it's working

Open a new conversation in Claude and type:

```
List all my N-sight clients.
```

Claude should respond with a list of your managed clients pulled live from N-sight. If you see an error, jump to the [Troubleshooting](#troubleshooting) section.

---

## Setup: Microsoft Copilot Studio

### Step 1: Open your agent

In Copilot Studio, open the agent you want to connect to N-sight (or create a new one).

### Step 2: Add an MCP action

1. In the left panel, click **Actions**
2. Click **Add an action**
3. Select **Model Context Protocol (MCP)**

### Step 3: Configure the connection

- **Server type:** stdio
- **Command:** `npx`
- **Arguments:** `nsight-mcp-server readonly` (or `production` for the Production server)
- **Environment variables:**
  - `NSIGHT_API_KEY` = your API key
  - `NSIGHT_SERVER_URL` = your regional URL

### Step 4: Save and test

Save the agent configuration and open a test conversation. Ask:

```
List all my N-sight clients.
```

---

## What You Can Ask

Here are example prompts organized by task. Copy and adapt these to your environment.

### Checking on clients and devices

```
List all my managed clients.
```
```
Show me all sites for Contoso.
```
```
List all devices at the Downtown site for Acme Corp.
```

### Monitoring and alerts

```
Which clients have failing checks right now?
```
```
Show me all failing checks for Contoso. Group them by check type.
```
```
Are there any open outages across my environment today?
```
```
What's the output of the failing disk check on server CONTOSO-DC01?
```

### Patch management

```
What patches are missing on device 12345?
```
```
Show me all critical patches that haven't been approved for Contoso.
```

### Antivirus

```
Are there any active AV threats across my environment?
```
```
Show me the AV scan history for device 12345.
```
```
What files are currently quarantined on workstation CONTOSO-WS01?
```

### Backup

```
Did all backups succeed last night for Contoso?
```
```
Show me the 90-day backup history for server CONTOSO-FILE01.
```

### Asset and performance

```
What hardware is installed on server CONTOSO-DC01?
```
```
Show me the CPU and RAM usage history for device 12345 over the last week.
```
```
What software is installed on workstation CONTOSO-WS01?
```

### Multi-step queries (the AI figures out the IDs for you)

```
Find all devices at Contoso that have failing patch checks, 
then show me which patches are missing on each one.
```
```
Show me all AV threats detected this week, grouped by client.
For any client with more than 3 threats, list the affected devices.
```

---

## Using the Production Server

The Production server can take actions — clearing checks, approving patches, running tasks, and more. Because these actions change your N-sight environment, it has a built-in safety system.

### How confirmation works

Every action requires you to explicitly confirm it before it runs. Here's what that looks like in practice:

**You ask:**
```
Clear the failing disk check (check ID 9876) on device 12345.
```

**The AI responds with a preview — nothing has happened yet:**
```json
{
  "action": "clear_check",
  "status": "pending_confirmation",
  "check_id": 9876,
  "device_id": 12345,
  "message": "Action not confirmed. Set confirm: true to clear this check."
}
```

**You confirm:**
```
Yes, go ahead and confirm it.
```

**The AI executes the action and responds:**
```json
{
  "action": "clear_check",
  "status": "success",
  "check_id": 9876,
  "device_id": 12345,
  "message": "Check cleared successfully.",
  "timestamp": "2024-06-08T14:23:11.000Z"
}
```

This two-step process means the AI will never take an action in your environment without your explicit approval.

### Adding the Production server to Claude Desktop

Add a second entry to your `claude_desktop_config.json` alongside the read-only server:

```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-server", "readonly"],
      "env": {
        "NSIGHT_API_KEY": "paste-your-api-key-here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    },
    "nsight-production": {
      "command": "npx",
      "args": ["nsight-mcp-server", "production"],
      "env": {
        "NSIGHT_API_KEY": "paste-your-api-key-here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us",
        "NSIGHT_MAX_WRITES_PER_SESSION": "20",
        "NSIGHT_AUDIT_LOG_PATH": "C:\\logs\\nsight-audit.log"
      }
    }
  }
}
```

### Production actions you can request

| What you ask | What happens |
|---|---|
| Clear a failing check | Acknowledges the alert in N-sight |
| Add a note to a check | Attaches your note to the check record |
| Approve a patch | Marks the patch for installation |
| Ignore a patch | Stops the patch being flagged on that device |
| Retry a failed patch | Re-queues the patch for installation |
| Start an AV scan | Triggers an on-demand Quick or Full scan |
| Cancel an AV scan | Stops a scan in progress |
| Update AV definitions | Forces an immediate definition update |
| Release a quarantined file | Restores the file to its original location |
| Remove a quarantined file | Permanently deletes the file (cannot be undone) |
| Run a task | Triggers a scheduled automation task immediately |
| Add a client | Creates a new managed client in N-sight |
| Add a site | Creates a new site under an existing client |

### The session write limit

The Production server has a default limit of **20 write actions per session**. Once you reach 20 confirmed actions, the server blocks further writes until you restart it. This prevents accidental runaway automation.

You can adjust this limit in your config:
```json
"NSIGHT_MAX_WRITES_PER_SESSION": "50"
```

---

## The Audit Log

Every action taken through the Production server is recorded to an audit log before it executes. The log records:

- What action was taken
- Which device or resource was affected
- All parameters passed (check ID, device ID, patch ID, etc.)
- A timestamp

You can find the log at the path you set in `NSIGHT_AUDIT_LOG_PATH`. It's a plain JSON file you can open in any text editor.

This log is append-only — entries are never modified or deleted. If an API call fails after the audit entry is written, the entry remains, giving you a full record of intent.

---

## Security

**Your API key is never exposed to the AI.** It lives in your local config file and is passed directly to N-sight's API. The AI only ever sees the data N-sight returns — not the key used to fetch it.

**The AI cannot take actions you haven't confirmed.** Every write operation returns a preview first. Nothing changes in your N-sight environment until you explicitly approve it.

**Scope your API key to a specific client group** if you want to limit the server to a subset of your managed clients. Set `NSIGHT_CLIENT_ID` in your config to the client ID you want to restrict to.

---

## Troubleshooting

### "I don't see any N-sight tools in Claude"

1. Make sure you fully quit and reopened Claude Desktop after editing the config file
2. Check the config file for JSON syntax errors — a missing comma or bracket will break it. Paste the contents into [jsonlint.com](https://jsonlint.com) to check
3. Make sure Node.js 18+ is installed: `node --version`

### "Error: NSIGHT_API_KEY and NSIGHT_SERVER_URL must be set"

The config file isn't passing the environment variables correctly. Check that:
- The API key is inside quotes: `"NSIGHT_API_KEY": "abc123..."`
- There are no extra spaces around the key value
- You saved the file after editing

### "The list comes back empty"

- Confirm your regional URL matches your N-sight account region
- Verify the API key is active in N-sight (Settings > General Settings > API)
- If using `NSIGHT_CLIENT_ID`, make sure the client ID is correct

### "I get a rate limit error"

N-sight allows a maximum of 60 API calls per minute. If you're running many queries in quick succession, the server will automatically queue and throttle them. Wait a moment and try again.

### "The Production server isn't showing up as a separate tool"

If you added both servers to your config, check that they have different keys in the `mcpServers` object (`"nsight"` and `"nsight-production"` in the example above). If they share the same key, one will overwrite the other.

---

## Tips for Getting the Most Out of It

**Let the AI chain queries together.** Instead of asking for a client ID first and then using it in a second query, just ask the full question:

```
Show me all failing checks for Contoso.
```

The AI will call `list_clients` to find Contoso's ID, then call `list_failing_checks` with that ID — automatically.

**Ask for summaries.** The AI can interpret and summarize the data it retrieves:

```
Give me a health summary for all my clients. 
Flag anyone with more than 5 failing checks.
```

**Use it for reports.** Ask the AI to format the output as a table, bullet list, or plain-language summary for a client-facing report.

**Combine read and write in one workflow:**

```
Find all devices at Contoso with failing disk checks, 
show me the check output for each one, 
then for any check that's been failing for more than 24 hours, 
clear it and add a note that it's been reviewed.
```

The AI will walk through each step, pausing for your confirmation before any write action.

---

## Reference: All Available Tools

### Read-Only (available in both servers)

| Tool | What you ask for |
|---|---|
| `list_clients` | All managed clients |
| `list_sites` | Sites for a specific client |
| `list_devices` | Servers and workstations at a site |
| `list_failing_checks` | All failing monitors |
| `list_checks` | All checks configured on a device |
| `list_outages` | Open and closed outages |
| `get_check_output` | Detailed output/logs for a specific check |
| `list_patches` | Patch status per device |
| `list_av_threats` | Active AV threat detections |
| `list_av_scans` | AV scan history |
| `list_av_quarantine` | Quarantined files |
| `list_backup_sessions` | Backup job history |
| `list_backup_history` | 90-day daily backup history |
| `list_ad_users` | Active Directory users at a site |
| `list_hardware` | Hardware profile for a device |
| `list_software` | Installed software on a device |
| `list_drive_history` | Drive space history |
| `list_performance_history` | CPU, RAM, and bandwidth history |
| `list_client_license_count` | License allocations for a client |
| `list_device_asset_details` | Full hardware/software specs for a device |
| `get_device_assets` | Asset records for a device |

### Production only (write actions)

| Tool | What it does |
|---|---|
| `clear_check` | Acknowledge a failing check |
| `add_check_note` | Add a note to a check |
| `approve_patch` | Approve a patch for installation |
| `ignore_patch` | Mark a patch as ignored |
| `retry_patch` | Retry a failed patch |
| `start_av_scan` | Start an on-demand AV scan |
| `cancel_av_scan` | Cancel an in-progress AV scan |
| `update_av_definitions` | Force an AV definition update |
| `release_quarantine_item` | Restore a quarantined file |
| `remove_quarantine_item` | Permanently delete a quarantined file |
| `run_task` | Run a scheduled task immediately |
| `add_client` | Create a new managed client |
| `add_site` | Create a new site |

---

*N-sight AI Connect is built and maintained by N-able Technologies.*
*For support, visit [developer.n-able.com](https://developer.n-able.com).*
