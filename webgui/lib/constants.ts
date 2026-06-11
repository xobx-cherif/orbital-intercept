// Client-safe shared constants & types (no secrets, no server-only imports).

export const MAX_ATTEMPTS = 2;

export type ScenarioStatus = "open" | "solved" | "skipped" | "locked";
