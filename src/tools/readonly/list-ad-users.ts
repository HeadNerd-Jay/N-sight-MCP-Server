/**
 * Tool: list_ad_users  [READ-ONLY]
 * Maps to N-sight service: list_active_directory_users
 * Docs: https://developer.n-able.com/n-sight/docs/listing-active-directory-users
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listADUsersTool: Tool = {
  name: "list_ad_users",
  description:
    "List all Active Directory users discovered for a specific site. " +
    "Returns user display names, email addresses, distinguishedName (DN), status, and device ID.",
  inputSchema: {
    type: "object",
    properties: {
      siteid: {
        type: "number",
        description: "The site ID.",
      },
    },
    required: ["siteid"],
  },
};

export async function listADUsers(
  client: NsightClient,
  args: { siteid: number }
): Promise<string> {
  const result = await client.call({
    service: "list_active_directory_users",
    siteid: args.siteid,
  });

  const rawUsers = (result as any).users?.user;
  const userList = Array.isArray(rawUsers) ? rawUsers : rawUsers ? [rawUsers] : [];

  if (userList.length === 0) {
    return `No Active Directory users found for site ID ${args.siteid}.`;
  }

  const formatted = userList.map((u) => {
    // Map status code:
    // 0 - unchanged, 1 - change unknown, 2 - modified, 3 - new, 4 - deleted, 5 - restored
    const statusMap: Record<number, string> = {
      0: "Unchanged",
      1: "Change Unknown",
      2: "Modified",
      3: "New",
      4: "Deleted",
      5: "Restored",
    };

    const statusId = u.status ? Number(u.status) : 0;

    return {
      guid: u.objectGUID ?? null,
      status: statusMap[statusId] || `Unknown status (${statusId})`,
      device_id: u.device ? Number(u.device) : null,
      display_name: u.displayName ?? null,
      mail: u.mail ?? null,
      user_principal_name: u.userPrincipalName ?? null,
      distinguished_name: u.distinguishedName ?? null,
      given_name: u.givenName ?? null,
      surname: u.sn ?? null,
      description: u.description ?? null,
    };
  });

  return JSON.stringify(
    {
      site_id: args.siteid,
      total_users: formatted.length,
      users: formatted,
    },
    null,
    2
  );
}
