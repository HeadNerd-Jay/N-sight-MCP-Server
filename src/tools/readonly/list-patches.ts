/**
 * Tool: list_patches  [READ-ONLY]
 * Maps to N-sight service: patch_list_all
 * Docs: https://developer.n-able.com/n-sight/docs/listing-all-software-patches
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NsightClient } from "../../core/client.js";

export const listPatchesTool: Tool = {
  name: "list_patches",
  description:
    "List all software patches (installed, missing, pending, failed, ignored) for a given device ID.",
  inputSchema: {
    type: "object",
    properties: {
      deviceid: {
        type: "number",
        description: "The unique identifier of the device.",
      },
    },
    required: ["deviceid"],
  },
};

export async function listPatches(
  client: NsightClient,
  args: { deviceid: number }
): Promise<string> {
  const result = await client.call({
    service: "patch_list_all",
    deviceid: args.deviceid,
  });

  const raw = (result as any).patch;
  const patchesList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (patchesList.length === 0) {
    return `No patches found for device ID ${args.deviceid}.`;
  }

  const formatted = patchesList.map((p) => ({
    patch_id: Number(p.patchid),
    title: String(p.patchTitle),
    product: String(p.product),
    status: String(p.statusLabel),
    status_code: Number(p.status),
    severity: String(p.severityLabel ?? "Unknown"),
    severity_code: p.severity ? Number(p.severity) : null,
    policy: String(p.policyLabel ?? "Unknown"),
    policy_code: p.policy ? Number(p.policy) : null,
    install_date_text: p.installdatetext ?? null,
    install_date_timestamp: p.installdate ? Number(p.installdate) : null,
    release_date_timestamp: p.releaseDate ? Number(p.releaseDate) : null,
    url: p.patchUrl ?? null,
    deployable: p.deployable === "1" || p.deployable === 1,
    uninstallable: p.uninstallable === "1" || p.uninstallable === 1,
  }));

  return JSON.stringify(
    {
      device_id: args.deviceid,
      total_patches: formatted.length,
      patches: formatted,
    },
    null,
    2
  );
}
