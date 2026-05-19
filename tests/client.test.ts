import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NsightClient } from "../src/core/client.js";

describe("NsightClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should build url correctly and query XML data to JSON", async () => {
    const mockXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
      <result created="2026-05-19T16:00:00" status="OK">
        <items>
          <client>
            <clientid>123</clientid>
            <name>Test Client</name>
          </client>
        </items>
      </result>`;

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockXml,
    });

    const client = new NsightClient({
      apiKey: "test-api-key",
      serverUrl: "https://www.systemmonitor.us/",
    });

    const result = await client.call({ service: "list_clients" });
    
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://www.systemmonitor.us/api/?apikey=test-api-key&service=list_clients",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
          "Accept": "application/xml"
        })
      })
    );

    expect(result).toEqual({
      client: {
        clientid: "123",
        name: "Test Client"
      }
    });
  });

  it("should throw error if response is not ok", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const client = new NsightClient({
      apiKey: "test-api-key",
      serverUrl: "https://www.systemmonitor.us",
    });

    await expect(client.call({ service: "list_clients" })).rejects.toThrow(
      "N-sight API error: 500 Internal Server Error"
    );
  });

  it("should throw error if result status is FAIL", async () => {
    const mockFailXml = `<?xml version="1.0"?>
      <result status="FAIL">
        <error>
          <errorcode>2</errorcode>
          <message>Invalid api key</message>
        </error>
      </result>`;

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockFailXml,
    });

    const client = new NsightClient({
      apiKey: "bad-key",
      serverUrl: "https://www.systemmonitor.us",
    });

    await expect(client.call({ service: "list_clients" })).rejects.toThrow(
      "N-sight API failure: Invalid api key"
    );
  });
});
