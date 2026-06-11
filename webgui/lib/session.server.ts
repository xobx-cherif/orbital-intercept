import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userScenarios, findUser } from "./users.server";
import { MAX_ATTEMPTS, type ScenarioStatus } from "./constants";

export { MAX_ATTEMPTS };
export type { ScenarioStatus };

// ============================================================================
// SESSION + PROGRESS — a single HMAC-signed cookie. No database.
//
// Cookie value: `${base64url(json)}.${base64url(hmac)}`
//   hmac = HMAC_SHA256(SESSION_SECRET, base64url(json))
// Tampering (changing attempts/status) invalidates the signature -> rejected.
//
// Honor-system caveat: a user can DELETE their own cookie to reset attempts.
// Hard-locking would need a server store (Upstash / Netlify Blobs) — see README.
// ============================================================================

export const COOKIE_NAME = "oi_session";

export type ScenarioProgress = {
  attempts: number; // 0..MAX_ATTEMPTS
  status: ScenarioStatus;
};

export type SessionState = {
  u: string; // username
  p: Record<string, ScenarioProgress>; // keyed by scenario id (the user's 4)
  iat: number; // issued-at (epoch seconds)
};

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h sessions

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "DEV_INSECURE_SESSION_SECRET_change_me";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(state: SessionState): string {
  const json = Buffer.from(JSON.stringify(state));
  const payload = b64url(json);
  const mac = b64url(crypto.createHmac("sha256", sessionSecret()).update(payload).digest());
  return `${payload}.${mac}`;
}

export function readSessionValue(value: string | undefined): SessionState | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", sessionSecret()).update(payload).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const state = JSON.parse(fromB64url(payload).toString("utf8")) as SessionState;
    if (!state || typeof state.u !== "string" || typeof state.iat !== "number") return null;
    if (Date.now() / 1000 - state.iat > MAX_AGE_SECONDS) return null;
    if (!findUser(state.u)) return null; // user no longer exists
    return state;
  } catch {
    return null;
  }
}

// Build a fresh session for a username, initialising progress for their 4.
export function freshSession(username: string): SessionState {
  const ids = userScenarios(username);
  const p: Record<string, ScenarioProgress> = {};
  for (const id of ids) p[id] = { attempts: 0, status: "open" };
  return { u: username, p, iat: Math.floor(Date.now() / 1000) };
}

// ---- cookie helpers (server components / route handlers) -------------------

export function getSession(): SessionState | null {
  return readSessionValue(cookies().get(COOKIE_NAME)?.value);
}

export function setSessionCookie(state: SessionState): void {
  cookies().set(COOKIE_NAME, signSession(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Gate helper for server components: returns the session or redirects to login.
export function requireSession(): SessionState {
  const s = getSession();
  if (!s) redirect("/login");
  return s;
}

// Normalise/repair progress so it always covers exactly the user's 4 scenarios.
export function ensureProgress(state: SessionState): SessionState {
  const ids = userScenarios(state.u);
  const p: Record<string, ScenarioProgress> = {};
  for (const id of ids) p[id] = state.p[id] ?? { attempts: 0, status: "open" };
  return { ...state, p };
}
