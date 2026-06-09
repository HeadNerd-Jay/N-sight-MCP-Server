# N-sight AI Connect — Client Setup Guide
## Claude Desktop and ChatGPT Desktop

This guide walks through connecting N-sight AI Connect to AI desktop clients that support
local MCP servers. Both clients use stdio transport, so no HTTP server or tunnel is needed.

---

## Prerequisites (both clients)

Complete these steps once before configuring either client.

### 1. Install Node.js

Download and install Node.js 18 or later from [nodejs.org](https://nodejs.org).
Node.js v18 LTS or v20 LTS is recommended for production stability.

Verify the install:

```bash
node --version
# Should print v18.x.x or higher
```

### 2. Get the server files

Clone or download the N-sight AI Connect repository:

```bash
git clone https://github.com/HeadNerd-Jay/N-sight-MCP-Server.git
cd N-sight-MCP-Server
npm install
npm run build
```

The `dist/` folder now contains the compiled servers. You will point your client at files
inside `dist/`.

### 3. Create your `.env` file

Copy the example file and fill in your credentials:

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` and set the two required values:

```env
NSIGHT_API_KEY=your_api_key_here
NSIGHT_SERVER_URL=https://www.systemmonitor.us
```

**Where to get your API key:** N-sight portal > Settings > General Settings > API.

**Server URL by region:**

| Region | URL |
|---|---|
| North America | `https://www.systemmonitor.us` |
| Americas (alternate) | `https://www.am.remote.management` |
| Europe | `https://www.systemmonitor.eu` |
| Asia Pacific | `https://wwwasia.systemmonitor.us` |
| UK | `https://www.systemmonitor.co.uk` |

The `.env` file is never committed to Git. It stays on your machine only.

### 4. Choose your server tier

| Server | File | Tools | Use when |
|---|---|---|---|
| **Read-Only** | `dist/readonly-server.js` | 23 tools (read) | General use, broad rollout |
| **Production** | `dist/production-server.js` | 36 tools (read + write) | Advanced, trusted users only |

Start with the Read-Only server. Add Production when you need patch approval,
task execution, or AV actions.

---

## Claude Desktop

### Config file location

| OS | Path |
|---|---|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Mac | `~/Library/Application Support/Claude/claude_desktop_config.json` |

### Configuration

Open `claude_desktop_config.json` in a text editor and add an `mcpServers` entry.
If the file already has other servers, add the new entry inside the existing
`mcpServers` block.

**Windows — Read-Only server:**

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

**Windows — Both servers:**

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

**Mac — Read-Only server:**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["/Users/yourname/N-sight-MCP-Server/dist/readonly-server.js"],
      "env": {}
    }
  }
}
```

> Replace `C:\\path\\to\\` (Windows) or `/Users/yourname/` (Mac) with the actual
> path where you cloned the repository. Use double backslashes on Windows.

The `"env": {}` block is intentional and correct. Credentials are loaded automatically
from the `.env` file in the repository folder — they do not go in the config.

### Restart Claude Desktop

After saving the config file, fully quit and relaunch Claude Desktop.
The N-sight tools appear in the tools panel (hammer icon) once the server loads.

### Verify it works

In Claude Desktop, ask:

```
List my N-sight clients
```

Claude should call `list_clients` and return your customer list.

---

## ChatGPT Desktop

> **Platform note:** MCP support in ChatGPT Desktop was introduced on **macOS first**.
> Windows support was added later. If you are on Windows and the steps below do not
> work, check the [ChatGPT release notes](https://help.openai.com/en/articles/9400317)
> for the current Windows MCP status.

### Config file location

| OS | Path |
|---|---|
| Mac | `~/Library/Application Support/com.openai.chat/mcp.json` |
| Windows | `%APPDATA%\ChatGPT\mcp.json` |

Create the file if it does not exist.

### Configuration

**Mac — Read-Only server:**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["/Users/yourname/N-sight-MCP-Server/dist/readonly-server.js"],
      "env": {}
    }
  }
}
```

**Mac — Both servers:**

```json
{
  "mcpServers": {
    "nsight": {
      "command": "node",
      "args": ["/Users/yourname/N-sight-MCP-Server/dist/readonly-server.js"],
      "env": {}
    },
    "nsight-production": {
      "command": "node",
      "args": ["/Users/yourname/N-sight-MCP-Server/dist/production-server.js"],
      "env": {}
    }
  }
}
```

**Windows — Read-Only server:**

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

### Enable MCP in ChatGPT Desktop

1. Open ChatGPT Desktop
2. Go to **Settings > Advanced**
3. Enable **Model Context Protocol (MCP)**
4. Restart ChatGPT Desktop

### Verify it works

Start a new chat and ask:

```
List my N-sight clients
```

ChatGPT should show a tool call to `list_clients` and return your customer list.
If you do not see a tool call, confirm MCP is enabled in Settings and that the
config file path is correct.

---

## OpenAI Agents SDK (for developers)

If you are building an agent in Python using the
[OpenAI Agents SDK](https://openai.github.io/openai-agents-python/), you can connect
the MCP server programmatically:

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

nsight_server = MCPServerStdio(
    command="node",
    args=["/path/to/N-sight-MCP-Server/dist/readonly-server.js"],
    # env is inherited from the process — set NSIGHT_API_KEY and NSIGHT_SERVER_URL
    # in your shell environment or .env before running this script
)

agent = Agent(
    name="N-sight Assistant",
    instructions="""
        You are an N-sight RMM assistant. Use get_environment_summary for
        a customer health overview. Use list_clients to resolve names to IDs.
        Always confirm the customer before calling scoped tools.
        Never call list_software or list_hardware across multiple devices.
    """,
    mcp_servers=[nsight_server],
)

async def main():
    async with nsight_server:
        result = await Runner.run(agent, "List my clients and summarise their health")
        print(result.final_output)
```

Set credentials in your environment before running:

```bash
# Mac / Linux
export NSIGHT_API_KEY=your_key
export NSIGHT_SERVER_URL=https://www.systemmonitor.us
python your_agent.py

# Windows PowerShell
$env:NSIGHT_API_KEY = "your_key"
$env:NSIGHT_SERVER_URL = "https://www.systemmonitor.us"
python your_agent.py
```

Or load them from the `.env` file using `python-dotenv`:

```python
from dotenv import load_dotenv
load_dotenv("/path/to/N-sight-MCP-Server/.env")
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| No N-sight tools appear | Server path wrong or Node.js not found | Use the full absolute path; confirm `node --version` works |
| "API key not set" error | `.env` file missing or in wrong location | Confirm `.env` is in the repository root folder (same folder as `package.json`) |
| "NSIGHT_SERVER_URL must use HTTPS" | URL in `.env` is `http://` not `https://` | Add the `s` — all N-sight URLs use HTTPS |
| Tools return empty results | Wrong server URL for your region | Check region table above; test with `node test-commands.mjs` in the repo folder |
| Server not listed in ChatGPT | MCP not enabled in settings | Settings > Advanced > Enable MCP, then restart |
| Windows ChatGPT MCP not working | Windows support may not be released yet | Check ChatGPT release notes; use Claude Desktop as an alternative |

### Test the server independently

Before debugging a client, confirm the server itself works:

```bash
cd /path/to/N-sight-MCP-Server
node test-commands.mjs
```

All 23 tools should show `PASS`. If any fail, the issue is credentials or network,
not the client configuration.

---

## What the tools can do

### Read-Only server (23 tools)

| Category | Tools |
|---|---|
| Inventory | `list_clients`, `list_sites`, `list_all_sites`, `list_devices` |
| Health | `get_environment_summary`, `list_failing_checks`, `list_checks`, `list_outages` |
| Patches | `list_patches` |
| Security | `list_av_threats`, `list_av_scans`, `list_av_quarantine` |
| Backup | `list_backup_sessions`, `list_backup_history` |
| Performance | `list_performance_history`, `list_drive_history` |
| Assets | `list_hardware`, `list_software`, `list_device_asset_details`, `get_device_assets` |
| Monitoring | `list_checks`, `get_check_output`, `list_ad_users` |
| Licensing | `list_client_license_count` |

### Production server (adds 13 write tools)

`clear_check`, `add_check_note`, `approve_patch`, `ignore_patch`, `retry_patch`,
`start_av_scan`, `cancel_av_scan`, `release_quarantine_item`, `remove_quarantine_item`,
`update_av_definitions`, `run_task`, `add_client`, `add_site`

All write tools require explicit confirmation before executing.

---

*Last updated: 2026-06-09*
