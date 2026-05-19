import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient, NsightRequestParams } from "../../core/client.js";

export const listClientLicenseCountTool: Tool = {
  name: "list_client_license_count",
  description:
    "Lists all software license counts, group IDs, counts, and installation numbers for a specific client.",
  inputSchema: {
    type: "object",
    properties: {
      clientid: {
        type: "number",
        description: "Required. The N-sight client ID to query licenses for.",
      },
    },
    required: ["clientid"],
  },
};

export async function listClientLicenseCount(
  client: NsightClient,
  args: { clientid: number }
): Promise<string> {
  const params: NsightRequestParams = {
    service: "list_client_license_count",
    clientid: args.clientid,
  };

  const result = await client.call(params);
  const raw = (result as any).license_count;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (list.length === 0) {
    return `No software licenses found for client ID ${args.clientid}.`;
  }

  const formatted = list.map((item) => ({
    license_count_id: Number(item.license_count_id),
    software_group_id: Number(item.swgrpid),
    name: String(item.name ?? ""),
    count: Number(item.count ?? 0),
    installed: Number(item.installed ?? 0),
  }));

  return JSON.stringify(
    {
      client_id: args.clientid,
      total_licenses: formatted.length,
      licenses: formatted,
    },
    null,
    2
  );
}
