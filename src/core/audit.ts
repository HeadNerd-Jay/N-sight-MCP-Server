/**
 * Audit Logger — Production Server Only
 * Logs are append-only and written BEFORE the action executes.
 */

import { appendFile } from "fs/promises";
import { resolve } from "path";

export interface AuditEntry {
  action: string;
  operator: string;
  params: Record<string, unknown>;
  timestamp?: string;
}

export class AuditLogger {
  private logPath: string;
  private enabled: boolean;

  constructor(logPath?: string, enabled: boolean = true) {
    this.logPath = resolve(logPath ?? "./logs/audit.log");
    this.enabled = enabled;
  }

  async log(entry: AuditEntry): Promise<void> {
    if (!this.enabled) return;
    const record = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    await appendFile(this.logPath, record + "\n", "utf8").catch((err) => {
      throw new Error(`Audit log write failed: ${err.message}. Action aborted.`);
    });
  }
}
