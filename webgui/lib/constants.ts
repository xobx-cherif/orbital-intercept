// Client-safe shared constants & types (no secrets, no server-only imports).

export const MAX_ATTEMPTS = 2;

export type ScenarioStatus = "open" | "solved" | "skipped" | "locked";

// Test/instructor accounts that are allowed to use the "Run constraint
// analysis" helper on SCORED scenarios (it reveals the passing provider, so it
// is hidden from real operators). Practice drills always allow it.
export const TEST_ACCOUNTS = new Set(["testuser"]);

export function isTestAccount(username: string): boolean {
  return TEST_ACCOUNTS.has(username.trim().toLowerCase());
}
