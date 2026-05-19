# N-sight MCP Server Testing Use Cases & Example Prompts

This document outlines the testing use cases, target tool parameters, and example natural language prompts for engineering teams to test the N-sight MCP Server with an AI assistant (like Claude Desktop).

---

## 1. Client & Site Discovery

### `list_clients`
*   **Purpose**: Get a top-level list of all clients (customers) managed in N-sight.
*   **Example Prompts**:
    *   *"List all of our clients in N-sight."*
    *   *"Show me all N-sight customers."*
    *   *"Who are the clients currently configured in RMM?"*

### `list_sites`
*   **Purpose**: Fetch all sites associated with a specific client ID.
*   **Example Prompts**:
    *   *"Show me the sites for client ID 129052."*
    *   *"List the sites under Company 1."*
    *   *"Find all physical sites for client 129055."*

---

## 2. Device Discovery & Asset Status

### `list_devices`
*   **Purpose**: List all servers and workstations at a specific site ID.
*   **Example Prompts**:
    *   *"List all servers and workstations for site 193393."*
    *   *"What devices are configured at Cork site (ID 436119)?"*
    *   *"Show me all machines registered at site ID 193402."*

### `get_device_assets`
*   **Purpose**: Look up active agent modules (Managed Antivirus, Online Backup, Patch Management, Web Protection) and check counters for a device.
*   **Example Prompts**:
    *   *"Get active feature and module statuses for device 1806704."*
    *   *"Is Managed Antivirus or Backup enabled on workstation 3177206?"*
    *   *"Check the agent asset features for server ID 1806830."*

---

## 3. Monitoring, Health & Checks

### `list_checks`
*   **Purpose**: List all 24/7 or Daily Safety Checks configured on a device.
*   **Example Prompts**:
    *   *"What monitoring checks are configured on device 1806704?"*
    *   *"Show me a list of all active checks for device ID 3177206."*
    *   *"Get the status of all checks for machine 1806851."*

### `list_failing_checks`
*   **Purpose**: Show only failing checks across all devices (optionally filtered by client or check type).
*   **Example Prompts**:
    *   *"List all failing checks right now."*
    *   *"Show me which checks are failing for client ID 129052."*
    *   *"Are there any failing Disk Space checks active?"*

### `get_check_output`
*   **Purpose**: Fetch detailed diagnostic output text from a specific check ID.
*   **Example Prompts**:
    *   *"Get the output result for check ID 103132947."*
    *   *"Why did check 107271762 fail? Show me the output."*
    *   *"Print the detailed log output for check ID 102110201."*

### `list_outages`
*   **Purpose**: Retrieve open or recently closed device outages from the last 61 days.
*   **Example Prompts**:
    *   *"Are there any open outages on device 1806704?"*
    *   *"List the outage history for device ID 3177206."*
    *   *"Show me outages from the last 60 days on machine 1806851."*

---

## 4. Active Directory & User Operations

### `list_ad_users`
*   **Purpose**: List synchronized Active Directory users at a site.
*   **Example Prompts**:
    *   *"List all Active Directory users discovered for site ID 193393."*
    *   *"Show AD user directory details for site 436119."*
    *   *"Who are the AD users configured under site 193402?"*

---

## 5. Software, Patches & Antivirus (Security)

### `list_software`
*   **Purpose**: List all installed software registry entries on a device (by asset ID).
*   **Example Prompts**:
    *   *"List the installed software on asset ID 1806704."*
    *   *"Show me all registered applications on device asset 1806830."*
    *   *"What software is installed on device asset ID 3177206?"*

### `list_patches`
*   **Purpose**: List all missing, installed, or pending security patches on a device.
*   **Example Prompts**:
    *   *"Show patch compliance and missing updates for device ID 1806704."*
    *   *"List all patches installed on server 1806830."*
    *   *"What is the patch status for device 3177206?"*

### `list_av_threats`
*   **Purpose**: Retrieve recent threat history detected by Managed Antivirus (MAV).
*   **Example Prompts**:
    *   *"List antivirus threats found on device 1806704."*
    *   *"Has MAV detected any recent threats on workstation 3177206?"*
    *   *"Show threat detection logs for device ID 1806851."*

### `list_av_scans`
*   **Purpose**: Check history and details of Managed Antivirus scans.
*   **Example Prompts**:
    *   *"Show antivirus scan history for device 1806704."*
    *   *"When was the last full antivirus scan run on workstation 3177206?"*
    *   *"List all scan logs for device ID 1806851."*

### `list_av_quarantine`
*   **Purpose**: Check items currently held in MAV quarantine.
*   **Example Prompts**:
    *   *"List quarantined items on device 1806704."*
    *   *"Are there files held in quarantine on workstation 3177206?"*
    *   *"Show me MAV quarantine status for device ID 1806851."*

---

## 6. Hardware & Performance (Telemetry)

### `list_hardware`
*   **Purpose**: Pull physical hardware specifications (CPU, RAM, NICs, motherboard, etc.) for a device.
*   **Example Prompts**:
    *   *"List hardware details for asset ID 1806704."*
    *   *"Show me specs of motherboard, network cards, and memory for asset 3177206."*
    *   *"Print the system hardware profile for asset ID 1806830."*

### `list_drive_history`
*   **Purpose**: Retrieve historical logs of drive size and free space over time.
*   **Example Prompts**:
    *   *"Show weekly drive space history logs for device ID 1806704."*
    *   *"Get daily disk space usage history for machine 3177206."*
    *   *"Retrieve monthly drive consumption trend for device 1806851."*

### `list_performance_history`
*   **Purpose**: Fetch processor, physical memory, and network bandwidth history telemetry.
*   **Example Prompts**:
    *   *"Get system performance history telemetry for device 1806704."*
    *   *"Show CPU and memory usage history logs for workstation 3177206."*
    *   *"Retrieve network bandwidth performance history for device 1806851."*

---

## 7. Backups & Recovery

### `list_backup_sessions`
*   **Purpose**: Retrieve details of Managed Online Backup sessions (files, sizes, duration, errors).
*   **Example Prompts**:
    *   *"Show backup session logs and transfers for device ID 1806704."*
    *   *"Retrieve session history for Online Backup on workstation 3177206."*
    *   *"Were there any failed backup sessions on device 1806851?"*

### `list_backup_history`
*   **Purpose**: Check daily backup check status over the last 90 days.
*   **Example Prompts**:
    *   *"List the 90-day daily backup history for device ID 1806704."*
    *   *"Show daily backup check statuses for workstation 3177206."*
    *   *"Get backup status history logs for device 1806851."*
