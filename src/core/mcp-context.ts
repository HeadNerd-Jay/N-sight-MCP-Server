/**
 * McpContext — per-request helper for logging and progress notifications.
 *
 * Wraps server.sendLoggingMessage() and the notifications/progress method.
 * All methods swallow their own errors so a logging or progress failure
 * can never surface as a tool error.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

type LogLevel =
  | "debug" | "info" | "notice" | "warning"
  | "error" | "critical" | "alert" | "emergency";

type ProgressToken = string | number;

export class McpContext {
  private server: Server;
  private progressToken: ProgressToken | undefined;

  constructor(server: Server, progressToken?: ProgressToken) {
    this.server = server;
    this.progressToken = progressToken;
  }

  async log(level: LogLevel, message: string): Promise<void> {
    try {
      await this.server.sendLoggingMessage({ level, data: message });
    } catch {
      // Never let logging failures surface as tool errors
    }
  }

  async progress(current: number, total: number): Promise<void> {
    if (this.progressToken === undefined) return;
    try {
      await this.server.notification({
        method: "notifications/progress",
        params: {
          progressToken: this.progressToken,
          progress: current,
          total,
        },
      });
    } catch {
      // Never let progress failures surface as tool errors
    }
  }
}
