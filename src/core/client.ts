/**
 * N-sight API HTTP Client
 * API reference: https://developer.n-able.com/n-sight/docs/getting-started-with-the-n-sight-api
 *
 * Note: N-sight servers sit behind Cloudflare WAF which blocks requests
 * without a recognised User-Agent. A browser-like UA is required.
 */

import { parseStringPromise } from "xml2js";
import { RateLimiter } from "./ratelimit.js";

export interface NsightClientConfig {
  apiKey: string;
  serverUrl: string;
  clientId?: string;
  rateLimitPerMin?: number;
}

export interface NsightRequestParams {
  service: string;
  [key: string]: string | number | undefined;
}

// Cloudflare WAF blocks requests without a recognised User-Agent.
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NsightMCPServer/0.1)",
  "Accept": "application/xml",
};

export class NsightClient {
  private config: NsightClientConfig;
  private rateLimiter: RateLimiter;

  constructor(config: NsightClientConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimitPerMin ?? 60);
  }

  async call(params: NsightRequestParams): Promise<Record<string, unknown>> {
    await this.rateLimiter.acquire();
    const url = this.buildUrl(params);
    const response = await fetch(url, { headers: REQUEST_HEADERS });

    if (!response.ok) {
      throw new Error(`N-sight API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

    if (parsed?.result?.status === "FAIL" || parsed?.result?.["$"]?.status === "FAIL") {
      const err = parsed?.result?.error;
      throw new Error(`N-sight API failure: ${err?.message ?? JSON.stringify(parsed.result)}`);
    }

    return parsed?.result?.items ?? parsed?.result ?? parsed;
  }

  private buildUrl(params: NsightRequestParams): string {
    const base = this.config.serverUrl.replace(/\/$/, "");
    const query = new URLSearchParams();
    query.set("apikey", this.config.apiKey);
    query.set("service", params.service);

    if (this.config.clientId && !params.clientid) {
      query.set("clientid", this.config.clientId);
    }

    for (const [key, value] of Object.entries(params)) {
      if (key !== "service" && value !== undefined) {
        query.set(key, String(value));
      }
    }

    return `${base}/api/?${query.toString()}`;
  }
}
