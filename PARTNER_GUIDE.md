# N-sight AI Connect — Partner Setup Guide

Connect your AI assistant to N-sight RMM and start querying your managed environment in plain language — no scripting, no dashboards.

This guide covers setup for **Claude Desktop**, **ChatGPT Desktop**, **OpenAI Codex CLI**, and **Microsoft Copilot Studio**.

---

## What Is N-sight AI Connect?

N-sight AI Connect is an MCP (Model Context Protocol) server that runs locally on your machine and bridges your AI assistant to your N-sight account. Once connected, you can ask natural-language questions like:

- *"Which of my clients have failing checks right now?"*
- *"Show me all devices at Contoso that are missing critical patches."*
- *"Give me a health summary across all my managed clients."*
- *"Clear the failing disk check on CONTOSO-DC01 and add a note."*

The server handles all communication with N-sight. Your AI client never sees your API key — only the data N-sight returns.

---

## Before You Start

You need three things regardless of which AI client you use.

### 1. Node.js 18 or later

Check if you already have it:

```
node --version
```

If the output shows `v18.x.x` or higher, you're ready. Otherwise, download and install the **LTS version** from [nodejs.org](https://nodejs.org). Accept all defaults during installation.

### 2. Your N-sight API Key

1. Log in to your N-sight dashboard
2. Go to **Settings** (top-right menu) > **General Settings**
3. Click the **API** tab
4. Copy your API key. If you don't have one, click **Generate** to create one.

Keep this key private. It grants full access to your N-sight account.

### 3. Your Regional Server URL

| Your N-sight login URL contains | Use this URL |
|---|---|
| `systemmonitor.us` | `https://www.systemmonitor.us` |
| `systemmonitor.eu` | `https://www.systemmonitor.eu` |
| `wwwasia.systemmonitor.us` | `https://wwwasia.systemmonitor.us` |

Not sure? Check the URL bar when you log in to N-sight.

---

## Choose Your Installation Method

There are two ways to install N-sight AI Connect. Choose the one that suits your environment.

### Option A: npm (Recommended)

Requires Node.js and an internet connection. The server downloads and runs automatically — no manual file management.

**Verify npm is available:**
```
npm --version
```

That's all the setup needed. The config snippets below use `npx` which handles the rest automatically.

### Option B: GitHub Release (Manual Install)

Use this if your environment restricts internet access during runtime, or if you prefer to manage files manually.

**Steps:**

1. Go to the [N-sight AI Connect Releases](https://github.com/HeadNerd-Jay/N-sight-MCP-Server/releases) page
2. Download the latest release zip: `nsight-mcp-server-vX.X.X.zip`
3. Unzip it to a permanent location, for example:
   - **Windows:** `C:\Tools\nsight-mcp-server\`
   - **Mac:** `~/Tools/nsight-mcp-server/`
4. Open a terminal, navigate to that folder, and run:
   ```
   npm install --omit=dev
   ```

Keep note of the full path to the `dist/` folder inside — you'll need it in the config steps below.

---

## Setup: Claude Desktop

### Step 1: Locate the config file

**Windows:**
Press `Win + R`, type `%APPDATA%\Claude\` and press Enter. Open `claude_desktop_config.json`. If it doesn't exist, create a new text file with that exact name.

**Mac:**
Open Finder, press `Cmd + Shift + G`, paste `~/Library/Application Support/Claude/` and press Go. Open `claude_desktop_config.json`.

### Step 2: Add the configuration

**Using npm (Option A):**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-readonly"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key_here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

**Using manual install (Option B):**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["C:\\Tools\\nsight-mcp-server\\dist\\readonly-server.js"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key_here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    }
  }
}
```

> On Mac, use forward slashes: `"/Users/yourname/Tools/nsight-mcp-server/dist/readonly-server.js"`

If you already have other MCP servers configured, add the `"nsight"` block inside the existing `"mcpServers"` section — don't replace the whole file.

### Step 3: Save and restart Claude Desktop

Save the file. **Fully quit Claude Desktop** (don't just close the window — on Windows, right-click the system tray icon and choose Quit). Reopen it.

### Step 4: Verify

Open a new conversation and type:
```
List all my N-sight clients.
```

Claude should respond with your live client list from N-sight.

---

## Setup: ChatGPT Desktop

ChatGPT configures MCP connections through its web settings rather than a local config file.

### Step 1: Enable Developer Mode

1. Go to [chatgpt.com](https://chatgpt.com) and sign in
2. Click your profile icon (top-right) > **Settings**
3. Navigate to **Apps & Connectors**
4. Enable **Developer Mode** if prompted

### Step 2: Add the MCP server

1. Click **Add connector** or **Add MCP server**
2. Fill in the fields:

**Using npm (Option A):**

| Field | Value |
|---|---|
| Name | `N-sight AI Connect` |
| Transport | `stdio` |
| Command | `npx` |
| Arguments | `nsight-mcp-readonly` |
| NSIGHT_API_KEY | your API key |
| NSIGHT_SERVER_URL | your regional URL |

**Using manual install (Option B):**

| Field | Value |
|---|---|
| Name | `N-sight AI Connect` |
| Transport | `stdio` |
| Command | `node` |
| Arguments | `C:\Tools\nsight-mcp-server\dist\readonly-server.js` |
| NSIGHT_API_KEY | your API key |
| NSIGHT_SERVER_URL | your regional URL |

### Step 3: Save and verify

Save the connector. Open a new chat and type:
```
List all my N-sight clients.
```

---

## Setup: OpenAI Codex CLI

Codex CLI is OpenAI's command-line AI agent. It stores MCP configuration in a TOML file.

### Step 1: Install Codex CLI

If you don't have it:
```
npm install -g @openai/codex
```

### Step 2: Add the MCP server

**Using the CLI (easiest):**

```
codex mcp add nsight
```

Follow the prompts to enter the command, arguments, and environment variables.

**Or edit the config file directly:**

Open `~/.codex/config.toml` (create it if it doesn't exist) and add:

**Using npm (Option A):**

```toml
[mcp_servers.nsight]
command = "npx"
args = ["nsight-mcp-readonly"]

[mcp_servers.nsight.env]
NSIGHT_API_KEY = "your_api_key_here"
NSIGHT_SERVER_URL = "https://www.systemmonitor.us"
```

**Using manual install (Option B):**

```toml
[mcp_servers.nsight]
command = "node"
args = ["/Users/yourname/Tools/nsight-mcp-server/dist/readonly-server.js"]

[mcp_servers.nsight.env]
NSIGHT_API_KEY = "your_api_key_here"
NSIGHT_SERVER_URL = "https://www.systemmonitor.us"
```

### Step 3: Verify

```
codex "List all my N-sight clients."
```

---

## Setup: Microsoft Copilot Studio

### Step 1: Open your agent

In [Copilot Studio](https://copilotstudio.microsoft.com), open the agent you want to connect to N-sight, or create a new one.

### Step 2: Add an MCP action

1. In the left panel, select **Actions**
2. Click **Add an action**
3. Choose **Model Context Protocol (MCP)**

### Step 3: Configure the connection

**Using npm (Option A):**

| Field | Value |
|---|---|
| Server type | `stdio` |
| Command | `npx` |
| Arguments | `nsight-mcp-readonly` |
| NSIGHT_API_KEY | your API key |
| NSIGHT_SERVER_URL | your regional URL |

**Using manual install (Option B):**

| Field | Value |
|---|---|
| Server type | `stdio` |
| Command | `node` |
| Arguments | `C:\Tools\nsight-mcp-server\dist\readonly-server.js` |
| NSIGHT_API_KEY | your API key |
| NSIGHT_SERVER_URL | your regional URL |

### Step 4: Save and test

Save the agent. Open a test conversation and type:
```
List all my N-sight clients.
```

---

## Read-Only vs Production Server

You've set up the **Read-Only** server above. It gives your AI assistant full visibility into your N-sight environment — clients, devices, checks, patches, AV, backups — but cannot change anything.

The **Production** server adds 13 remediation actions: clearing checks, approving patches, running tasks, managing AV scans, and more.

### Adding the Production server

The Production server runs alongside the Read-Only server. Add a second entry to your config using the same steps above, replacing:

- `nsight-mcp-readonly` with `nsight-mcp-production` (npm)
- `readonly-server.js` with `production-server.js` (manual)

Add these additional environment variables:

| Variable | Value | Description |
|---|---|---|
| `NSIGHT_MAX_WRITES_PER_SESSION` | `20` | Max actions before restart required |
| `NSIGHT_AUDIT_LOG_ENABLED` | `true` | Record all actions to a log file |
| `NSIGHT_AUDIT_LOG_PATH` | `C:\Logs\nsight-audit.log` | Where to write the audit log |

**Example for Claude Desktop (npm):**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "npx",
      "args": ["nsight-mcp-readonly"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key_here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us"
      }
    },
    "nsight-production": {
      "command": "npx",
      "args": ["nsight-mcp-production"],
      "env": {
        "NSIGHT_API_KEY": "your_api_key_here",
        "NSIGHT_SERVER_URL": "https://www.systemmonitor.us",
        "NSIGHT_MAX_WRITES_PER_SESSION": "20",
        "NSIGHT_AUDIT_LOG_PATH": "C:\\Logs\\nsight-audit.log"
      }
    }
  }
}
```

### How the Production server confirms actions

Every write action requires your explicit approval before it executes. The AI shows you a preview first:

**You ask:**
```
Clear the failing disk check on CONTOSO-DC01.
```

**AI responds (nothing has happened yet):**
```
I'll clear check ID 9876 on device CONTOSO-DC01. Confirm?
```

**You confirm:**
```
Yes, go ahead.
```

**AI executes and confirms:**
```
Done. Check cleared successfully at 14:23 UTC.
```

---

## What You Can Ask

### Environment overview

```
Give me a health summary across all my managed clients.
```
```
List all my clients and how many failing checks each has.
```
```
How many devices do I have total, and how many are offline?
```

### Clients and devices

```
List all my managed clients.
```
```
Show me all sites for Contoso.
```
```
List all devices at the Downtown site for Acme Corp.
```
```
Give me a full device inventory — all clients, all sites.
```

### Monitoring and alerts

```
Which clients have failing checks right now?
```
```
Show me all failing checks for Contoso, grouped by check type.
```
```
What's the output of the failing disk check on CONTOSO-DC01?
```
```
Are there any open outages today?
```

### Patch management

```
What patches are missing on CONTOSO-DC01?
```
```
Show me all critical patches not yet approved across all clients.
```
```
Approve the missing Windows Security patch on device 12345.
```
*(Production server required for approval)*

### Antivirus

```
Are there active AV threats anywhere in my environment?
```
```
Show me the AV scan history for CONTOSO-WS01.
```
```
What files are quarantined on Contoso devices this week?
```
```
Start a full AV scan on CONTOSO-DC01.
```
*(Production server required for scan)*

### Backup

```
Did all backups succeed last night for Contoso?
```
```
Show me the 90-day backup history for CONTOSO-FILE01.
```

### Assets and performance

```
What hardware is installed on CONTOSO-DC01?
```
```
Show me CPU and RAM usage for CONTOSO-DC01 over the last week.
```
```
What software is installed on CONTOSO-WS01?
```

### Multi-step workflows

```
Find all devices with failing disk checks, show me the check 
output for each, then clear any that have been failing over 24 hours.
```
```
Show me all clients with more than 5 failing checks and list 
the failing checks for each one.
```

---

## Troubleshooting

### "No N-sight tools appear in my AI client"

- Fully quit and reopen your AI client (don't just close the window)
- Check your config file for missing commas or brackets — paste the JSON into [jsonlint.com](https://jsonlint.com) to validate
- Confirm Node.js 18+ is installed: `node --version`

### "NSIGHT_API_KEY and NSIGHT_SERVER_URL must be set"

- Confirm both values are in the `env` section of your config
- Check there are no extra spaces around the values
- Make sure the file was saved before restarting your AI client

### "The client list comes back empty"

- Verify your regional URL matches your N-sight login URL
- Confirm your API key is active: N-sight > Settings > General Settings > API
- Try logging into N-sight in a browser with the same credentials to confirm access

### "I get a rate limit error"

N-sight allows 60 API calls per minute. The server queues and throttles automatically. Wait a moment and try again — no action needed.

### "The Production server isn't appearing separately"

Check that the two servers have different keys in your config (`"nsight"` and `"nsight-production"`). If they share the same key, one overwrites the other.

### "npx is slow on first run"

The first `npx` call downloads the package. Subsequent calls use the cached version and start in under a second.

---

## Security

- **Your API key never leaves your machine.** It is passed directly from your local config to the N-sight API. The AI client never sees it.
- **The Production server cannot act without your confirmation.** Every write action shows a preview and waits for your explicit approval.
- **All Production actions are audit-logged** before they execute, with operator, action, parameters, and timestamp.
- **Scope your API key** to a specific client group by setting `NSIGHT_CLIENT_ID` in your config. Useful for multi-tenant environments where different technicians manage different clients.

---

## Available Tools Reference

### Read-Only (21 tools — available in both servers)

| Tool | What it returns |
|---|---|
| `list_clients` | All managed clients |
| `list_all_sites` | All sites across all clients |
| `list_all_devices` | All devices across all clients and sites |
| `get_environment_summary` | Health snapshot for a specific client |
| `list_sites` | Sites for a specific client |
| `list_devices` | Devices at a specific site |
| `list_failing_checks` | All failing monitors |
| `list_checks` | All checks on a device |
| `list_outages` | Open and closed outages |
| `get_check_output` | Detailed output for a specific check |
| `list_patches` | Patch status per device |
| `list_av_threats` | Active AV threat detections |
| `list_av_scans` | AV scan history |
| `list_av_quarantine` | Quarantined files |
| `list_backup_sessions` | Backup job history |
| `list_backup_history` | 90-day daily backup history |
| `list_ad_users` | Active Directory users |
| `list_hardware` | Hardware profile |
| `list_software` | Installed software |
| `list_drive_history` | Drive space history |
| `list_performance_history` | CPU, RAM, bandwidth history |
| `list_client_license_count` | License allocations |
| `list_device_asset_details` | Full device specifications |

### Production only (13 additional write tools)

| Tool | What it does |
|---|---|
| `clear_check` | Acknowledge a failing check |
| `add_check_note` | Add a note to a check |
| `approve_patch` | Approve a patch for installation |
| `ignore_patch` | Mark a patch as ignored |
| `retry_patch` | Retry a failed patch |
| `start_av_scan` | Start an on-demand AV scan |
| `cancel_av_scan` | Cancel an in-progress scan |
| `update_av_definitions` | Force an AV definition update |
| `release_quarantine_item` | Restore a quarantined file |
| `remove_quarantine_item` | Permanently delete a quarantined file |
| `run_task` | Run a scheduled task immediately |
| `add_client` | Create a new managed client |
| `add_site` | Create a new site |

---

*N-sight AI Connect is built and maintained by N-able Technologies.*
*For support and updates, visit [developer.n-able.com](https://developer.n-able.com).*
*Licensed under the Apache License 2.0.*
