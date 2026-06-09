# N-sight AI Connect — MCP Server

**Audience:** IT Professionals and MSPs
**Assumes:** Familiarity with MCP concepts. You know what a Model Context Protocol server is and roughly how it connects to an AI client.

---

## What This Is

N-sight AI Connect is an MCP server that gives your AI assistant direct, read-only (or read/write) access to your N-sight RMM environment. Instead of copying data out of dashboards and pasting it into a chat window, you ask questions in plain language and the AI queries your live N-sight data on your behalf.

Examples of what you can ask:

- "Which of my clients have failing checks right now?"
- "Show me the hardware details for CSP-0009 at Company 1."
- "What software is installed on AM4-MacOSx-Sequoia at Kelltic Cider?"
- "Give me an environment summary for Kelltic Cider Company."

---

## Documentation

| Guide | What it covers |
|---|---|
| This file | Installation, client setup, tool reference, testing, troubleshooting |
| [CLIENT-SETUP-GUIDE.md](CLIENT-SETUP-GUIDE.md) | Detailed setup for Claude Desktop, ChatGPT Desktop, and OpenAI Agents SDK |
| [COPILOT-STUDIO-GUIDE.md](COPILOT-STUDIO-GUIDE.md) | Connecting to Microsoft Copilot Studio via HTTP transport (v2) |
| [TOOL-REFERENCE.md](TOOL-REFERENCE.md) | Complete tool reference with all 36 tools, keywords, and triggers |

---

## Before You Start

You need three things:

1. **An N-sight account** with API access enabled.
2. **Your N-sight API key** — generate this from your N-sight portal under Settings > API.
3. **Your N-sight server URL** — confirm yours in your N-sight portal.

**Server URL by region:**

| Region | URL |
|---|---|
| North America | `https://www.systemmonitor.us` |
| Americas (alternate) | `https://www.am.remote.management` |
| Europe | `https://www.systemmonitor.eu` |
| Asia Pacific | `https://wwwasia.systemmonitor.us` |
| UK | `https://www.systemmonitor.co.uk` |

You also need **Node.js 18 or later** installed. Check with:

```powershell
node --version
```

If you don't have it:

```powershell
# Windows (via Chocolatey)
choco install nodejs

# Or download directly from nodejs.org
```

---

## Installation

### Step 1 — Get the server files

Clone the repo or download the release package:

```powershell
git clone https://github.com/HeadNerd-Jay/N-sight-MCP-Server.git
cd N-sight-MCP-Server
```

### Step 2 — Install dependencies and build

```powershell
npm install
npm run build
```

This compiles the TypeScript source into `dist/`. You should see no errors.

### Step 3 — Create your credentials file

In the project root, create a file named `.env`:

```
NSIGHT_API_KEY=your_api_key_here
NSIGHT_SERVER_URL=https://www.systemmonitor.us
```

Replace both values with your actual credentials. This file is gitignored and will never be committed to version control.

**Do not put your API key anywhere else.** Not in config files, not in environment variables passed through your AI client config, not in the command line. The `.env` file is the only place it belongs.

---

## Connecting to Your AI Client

### Claude Desktop (Windows)

Config file location:

```
C:\Users\<your-username>\AppData\Roaming\Claude\claude_desktop_config.json
```

Open that file (create it if it doesn't exist) and add the following inside the `mcpServers` object:

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["C:\\path\\to\\N-sight-MCP-Server\\dist\\readonly-server.js"],
      "env": {}
    }
  }
}
```

Replace the path with the actual full path to your `dist\readonly-server.js`. Use double backslashes on Windows.

To also enable write tools (clearing checks, adding notes, running tasks):

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["C:\\path\\to\\N-sight-MCP-Server\\dist\\readonly-server.js"],
      "env": {}
    },
    "nsight-production": {
      "command": "node",
      "args": ["C:\\path\\to\\N-sight-MCP-Server\\dist\\production-server.js"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop after saving. The N-sight tools will appear automatically in the next session.

### Claude Desktop (macOS)

Config file location:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Same JSON structure as above. Use forward slashes in the path:

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["/Users/your-username/N-sight-MCP-Server/dist/readonly-server.js"],
      "env": {}
    }
  }
}
```

### ChatGPT Desktop (Windows and macOS)

ChatGPT Desktop uses the same `mcpServers` JSON format. Config file locations:

- **Windows:** `%APPDATA%\ChatGPT\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/ChatGPT/claude_desktop_config.json`

Use the same JSON block shown for Claude Desktop above.

You also need to enable MCP in ChatGPT Desktop settings: go to **Settings > Advanced** and turn on **Enable MCP**.

Note: MCP support in ChatGPT Desktop was introduced after Claude Desktop. If the option isn't visible, check that you're on the latest version.

### OpenAI Agents SDK (Python)

For developers building agents programmatically:

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

nsight_server = MCPServerStdio(
    params={
        "command": "node",
        "args": ["/path/to/N-sight-MCP-Server/dist/readonly-server.js"],
        "env": {}
    }
)

async def main():
    async with nsight_server as server:
        agent = Agent(
            name="N-sight Assistant",
            instructions="You help IT teams query their N-sight RMM environment.",
            mcp_servers=[server]
        )
        result = await Runner.run(agent, "List all my clients.")
        print(result.final_output)
```

Credentials are loaded from the `.env` file automatically by the server on startup.

### Future Clients

Any MCP-compatible client that supports stdio transport can connect to this server using the same pattern:

- **Command:** `node`
- **Args:** full path to `dist/readonly-server.js` (or `production-server.js` for write access)
- **Env:** empty — credentials come from `.env` in the project directory

If a future client requires HTTP transport instead of stdio, see [COPILOT-STUDIO-GUIDE.md](COPILOT-STUDIO-GUIDE.md) for setup instructions.

---

## Available Tools — Read-Only Server

The read-only server exposes 23 tools, organized by function. Use these for monitoring, reporting, and querying without risk of changes to your environment.

### Environment and Summary

| Tool | What it does |
|---|---|
| `get_environment_summary` | Health and inventory snapshot for a single customer or specific sites |
| `list_all_sites` | All sites across all clients in one call |

**Scope requirement:** `get_environment_summary` requires you to specify a customer name or one or more site names. It will not run without that context and will reject any request that spans multiple customers.

### Clients and Sites

| Tool | What it does |
|---|---|
| `list_clients` | All clients in your N-sight account |
| `list_sites` | All sites for a specific client |

### Devices

| Tool | What it does |
|---|---|
| `list_devices` | Devices at a specific site (requires customer or site name) |
| `get_device_assets` | Asset information for a single device |

**Scope requirement:** `list_devices` requires at least a customer name or site name before it will run.

### Checks and Monitoring

| Tool | What it does |
|---|---|
| `list_checks` | Monitoring checks for a device |
| `list_failing_checks` | All checks currently failing across the account |
| `get_check_output` | Detailed output from a specific check |

### Patch Management

| Tool | What it does |
|---|---|
| `list_patches` | Patch status for a device |

### Software and Hardware (Single Device Only)

| Tool | What it does |
|---|---|
| `list_software` | Installed software on a device |
| `list_hardware` | Hardware details for a device |
| `list_device_asset_details` | Full asset record for a device |

**Important:** These three tools are intentionally restricted to one device at a time. If you ask for software or hardware across all your devices, the AI will ask you to name a specific device instead of looping through all of them. This protects your N-sight API from being overwhelmed on large accounts.

### Antivirus

| Tool | What it does |
|---|---|
| `list_av_threats` | Recent AV threats on a device |
| `list_av_scans` | AV scans run on a device |
| `list_av_quarantine` | Items in AV quarantine on a device |

### Backup

| Tool | What it does |
|---|---|
| `list_backup_history` | Backup check status over the last 90 days |
| `list_backup_sessions` | Individual backup session details |

### Performance and History

| Tool | What it does |
|---|---|
| `list_performance_history` | CPU, memory, and bandwidth metrics over time |
| `list_drive_history` | Historical disk usage over time |
| `list_outages` | Outages for a device (open or recently closed) |

### Other

| Tool | What it does |
|---|---|
| `list_ad_users` | Active Directory users at a site |
| `list_client_license_count` | Software license counts by client |

---

## Available Tools — Production Server

The production server includes all read-only tools plus write tools for taking action. Use with care — these tools make changes to your N-sight environment.

### Additional Write Tools

| Tool | What it does |
|---|---|
| `add_client` | Create a new client |
| `add_site` | Create a new site under a client |
| `clear_check` | Acknowledge and clear a failing check |
| `add_check_note` | Add a note to a monitoring check |
| `approve_patch` | Approve a pending patch for installation |
| `ignore_patch` | Mark a patch as ignored |
| `retry_patch` | Retry a failed patch installation |
| `run_task` | Run a scheduled automation task on a device |
| `start_av_scan` | Trigger an on-demand AV scan |
| `cancel_av_scan` | Cancel an in-progress AV scan |
| `update_av_definitions` | Force an AV definition update |
| `release_quarantine_item` | Restore a quarantined file |
| `remove_quarantine_item` | Permanently delete a quarantined file |

---

## Testing Your Connection

The repo includes an interactive terminal client and an automated test suite.

### Interactive terminal (see live logs and notifications)

```powershell
cd "C:\path\to\N-sight-MCP-Server"
node mcp-terminal.mjs
```

You'll get a prompt:

```
nsight>
```

Common commands:

| Command | Example |
|---|---|
| `clients` | `clients` |
| `sites <clientid>` | `sites 129052` |
| `devices <siteid>` | `devices 193393` |
| `summary <customer name>` | `summary Kelltic Cider Company` |
| `hardware <device_name> <assetid>` | `hardware CSP-0009 1771706` |
| `software <device_name> <assetid>` | `software CSP-0009 1771706` |
| `failing` | `failing` |
| `tools` | `tools` |
| `help` | `help` |

This client shows MCP log and progress notifications in real time as the server executes each tool call — useful for confirming the server is working correctly.

### Automated test suite

```powershell
node test-commands.mjs
```

Runs all 23 read-only tools against your live environment and reports pass/fail for each. Expect output like:

```
[1/23] tools ......................... PASS (23 tools loaded)
[2/23] clients ....................... PASS (6 clients)
...
[23/23] call list_client_license_count  PASS
All tests passed: 23/23
```

---

## Guardrails and Rate Limiting

The server includes built-in protections designed for MSPs managing large accounts.

**Single-device enforcement.** `list_software`, `list_hardware`, and `list_device_asset_details` use an in-memory session guard that blocks repeated calls within a 30-second window. If the AI starts looping through devices, the guard fires and tells it to stop and ask you for a specific device name.

**Scope requirements.** `list_devices` and `get_environment_summary` require context (customer name or site name) before executing. An unscoped call is rejected with a clear error message returned to the AI, which will then prompt you for that context.

**Single-customer enforcement.** `get_environment_summary` accepts multiple sites but only within a single customer. Any attempt to span multiple customers is rejected at runtime.

**No list_all_devices.** This tool was intentionally removed. An account with thousands of devices would generate an enormous API call with no practical value for most queries. Use `list_devices` scoped to a site instead.

---

## Keeping the Server Up to Date

When you pull new changes from the repo, always rebuild before restarting your AI client:

```powershell
cd "C:\path\to\N-sight-MCP-Server"
git pull
npm install
npm run build
```

Then restart Claude Desktop (or your chosen client) to load the updated tools.

---

## Troubleshooting

**The AI says it doesn't have any N-sight tools.**
Check that your config file is valid JSON and the path to `readonly-server.js` is correct and uses double backslashes on Windows. Restart the AI client after any config change.

**The AI asks me for a customer or site name even for basic queries.**
That's expected behavior for scoped tools. Provide the name and it will proceed.

**The AI refuses to list software across all my devices.**
That's intentional. Name a specific device and it will run the query.

**The server starts but returns no clients.**
Verify your `NSIGHT_API_KEY` and `NSIGHT_SERVER_URL` in the `.env` file. Run `node mcp-terminal.mjs` and type `clients` to see the raw response.

**Build errors after pulling an update.**
Run `npm install` before `npm run build` to pick up any new dependencies.

---

## Security Notes

Your API key lives only in the `.env` file in the project directory. It is gitignored and will not be committed if you fork or contribute to the repo. Never paste your API key into your AI client's config file or into a chat session.

The read-only server cannot make changes to your N-sight environment. If you only need monitoring and reporting capabilities, use `readonly-server.js` exclusively.

The production server has write access. Treat it the same way you would treat direct API access — be specific in your requests and confirm before asking it to take action on devices.
