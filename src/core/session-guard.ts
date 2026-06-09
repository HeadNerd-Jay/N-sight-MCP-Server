/**
 * SessionGuard — protects expensive, single-device tools from being called
 * in a loop or batch across multiple devices.
 *
 * How it works:
 *   A sliding time window (default 15 seconds) is maintained per guarded tool.
 *   If the same tool is called more than once within that window, the second
 *   call is rejected with a clear error instructing the LLM to stop iterating
 *   and ask the user to specify a single device.
 *
 * Guarded tools (enforced in readonly-server.ts):
 *   - list_software
 *   - list_hardware
 *   - list_device_asset_details
 *
 * Why 15 seconds?
 *   An LLM looping across devices fires calls near-simultaneously or within
 *   a few seconds. 15 seconds comfortably catches both parallel bursts and
 *   rapid sequential calls while still allowing a user to legitimately call
 *   the same tool twice in a normal conversation (they would naturally pause
 *   longer than 15 seconds between separate requests).
 */

interface CallRecord {
  deviceName: string;
  calledAt: number;
  inFlight: boolean;
}

export class SessionGuard {
  private cooldownMs: number;
  private calls: Map<string, CallRecord> = new Map();

  /**
   * @param cooldownSeconds How long after a call completes before the same tool
   *   can be called again. Defaults to 30 seconds. Also acts as the in-flight
   *   window — any call arriving while the previous one is still running is
   *   rejected immediately, regardless of elapsed time.
   */
  constructor(cooldownSeconds: number = 30) {
    this.cooldownMs = cooldownSeconds * 1000;
  }

  /**
   * Call BEFORE executing the tool. Returns null if allowed, or an error
   * string to return directly to the LLM if blocked.
   *
   * Records the call as in-flight immediately — parallel calls that arrive
   * before the first one completes will be blocked even within the same
   * event-loop cycle.
   */
  check(toolName: string, deviceName: string): string | null {
    const now = Date.now();
    const last = this.calls.get(toolName);

    if (last) {
      const elapsed = now - last.calledAt;
      const stillInFlight = last.inFlight;
      const withinCooldown = elapsed < this.cooldownMs;

      if (stillInFlight || withinCooldown) {
        const reason = stillInFlight
          ? `a call for device "${last.deviceName}" is still in progress`
          : `device "${last.deviceName}" was queried ${(elapsed / 1000).toFixed(1)}s ago (cooldown: ${this.cooldownMs / 1000}s)`;

        return (
          `STOP — ${toolName} is blocked: ${reason}. ` +
          `This tool is strictly scoped to ONE device per conversation turn. ` +
          `Do NOT call it in a loop, batch, or parallel sequence across multiple devices. ` +
          `If the user asked for data across multiple devices, stop immediately and respond: ` +
          `"I can only retrieve this data for one device at a time. ` +
          `Which specific device would you like me to check?" ` +
          `Do not retry or rephrase this call automatically.`
        );
      }
    }

    // Record as in-flight before any await — blocks parallel calls immediately
    this.calls.set(toolName, { deviceName, calledAt: now, inFlight: true });
    return null;
  }

  /**
   * Call AFTER the tool completes (success or error). Marks the call as no
   * longer in-flight so the cooldown window starts from completion time.
   */
  complete(toolName: string): void {
    const record = this.calls.get(toolName);
    if (record) {
      record.inFlight = false;
      record.calledAt = Date.now(); // cooldown starts from completion
    }
  }

  /**
   * Fully reset the guard for a tool (e.g. after user explicitly confirms
   * they want a second device). Not required for normal use.
   */
  reset(toolName: string): void {
    this.calls.delete(toolName);
  }
}
