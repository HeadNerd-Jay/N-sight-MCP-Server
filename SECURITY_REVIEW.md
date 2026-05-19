# Code Quality & Security Audit Report

This report presents a thorough review of the **N-sight MCP Server** implementation from both a software engineering and cybersecurity perspective.

---

## 1. Security Analysis & Threat Modeling

### A. Credential Management & Secrets Exposure
*   **Status**: **SECURE**
*   **Details**: 
    *   API tokens and endpoint URLs are loaded dynamically via environment variables (`.env`) utilizing the standard `dotenv` library.
    *   The project contains a `.gitignore` configured to explicitly block `.env` and `*.log` files from being committed to source control.
    *   No hardcoded credentials exist in the source codebase.

### B. Injection & Parameter Tampering
*   **Status**: **SECURE**
*   **Details**: 
    *   The `NsightClient` constructs all request query parameters using the standard browser-native `URLSearchParams` API:
        ```typescript
        const query = new URLSearchParams();
        query.set("apikey", this.config.apiKey);
        // ...
        return `${base}/api/?${query.toString()}`;
        ```
    *   This ensures that all input strings, device IDs, and other arguments are automatically URL-encoded and sanitized. It completely eliminates HTTP/Query parameter injection risks.

### C. Input Validation (MCP Layer)
*   **Status**: **SECURE**
*   **Details**: 
    *   Each tool registers a strict JSON Schema inside the MCP protocol definitions (e.g. `inputSchema` in `list_devices`, `list_checks`).
    *   The MCP SDK validates parameter types, requirement constraints, and allowed enum values (e.g. restricting `devicetype` to `"server" | "workstation"`, and `details` to `"YES" | "NO"`) *before* the handlers run. This prevents malformed/empty payloads from reaching the API client.

### D. Rate Limiting & Denial of Service (DoS) Mitigation
*   **Status**: **SECURE**
*   **Details**: 
    *   N-sight API endpoints have strict rate limit guidelines. The server uses a custom `RateLimiter` token-bucket queue (`src/core/ratelimit.ts`) wrapping all outbound client requests. 
    *   It limits concurrent calls to a configurable limit (default: 60/min), shielding both the local runtime and the N-sight API from being rate-limited or banned.

### F. Error Handling & Information Leakage
*   **Status**: **SECURE**
*   **Details**: 
    *   The application catches raw exceptions, parses N-sight XML error tags safely, and returns controlled, high-level messages instead of raw Node.js engine stack traces or server paths.
    *   Sensitive environment details are never printed to stdout/stderr in production.

---

## 2. Code Quality & Architecture Review

### A. Modularity & Extensibility
*   **Status**: **EXCELLENT**
*   **Details**:
    *   **Single Responsibility Principle (SRP)**: Each API tool has its own dedicated TS file under `src/tools/readonly/`.
    *   **Low Coupling**: The `NsightClient` handles the core HTTP, XML-to-JSON, and rate-limiting tasks. The individual tools only handle input parameters and output mapping. Adding future tools requires zero modification to existing tool logic.

### B. Type Safety (TypeScript)
*   **Status**: **EXCELLENT**
*   **Details**:
    *   Strict parameter interfaces (e.g. `NsightRequestParams`) ensure only valid types (`string | number | undefined`) can be passed to the Client.
    *   Compiles cleanly using the standard TypeScript compiler (`tsc --noEmit`) without type warnings.

### C. XML Array Parsing Resilience
*   **Status**: **EXCELLENT**
*   **Details**:
    *   A common pitfall with XML-to-JSON converters (like `xml2js`) is that elements returning a single item are represented as objects, while multiple items are represented as arrays.
    *   All list tools use defensive array normalization:
        ```typescript
        const raw = (result as any).check;
        const checksList = Array.isArray(raw) ? raw : raw ? [raw] : [];
        ```
    *   This makes the tools highly resilient against runtime exceptions when N-sight returns exactly one check or one device outage.

### D. Coding Conventions & ESM
*   **Status**: **EXCELLENT**
*   **Details**:
    *   Uses standard ES Modules (`import/export` syntax with `.js` extensions on local imports), matching modern Node.js standards.
    *   Standard directory separation of concern: `src/core/` for architecture, `src/tools/` for execution tools, and `dist/` for production artifacts.

---

## 3. Recommendations for Security & Engineering Teams

1.  **Transport Security (TLS)**: Ensure `NSIGHT_SERVER_URL` in the production environment always uses `https://`.
2.  **Access Control**: Ensure the N-sight API Key generated in the RMM Dashboard is granted only the *least privilege* needed for read-only actions (disable write/delete API scopes for this integration key).
