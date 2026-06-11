import "server-only";
import crypto from "crypto";
import { type Scenario, correctCanonicalPlan } from "./scenarios";

// ============================================================================
// PER-USER, PER-SCENARIO FLAGS — derived, never stored as plaintext.
//
//   flag = `CTF{<kind>_<scenarioId>_<token>}`
//   token = HMAC_SHA256(FLAG_SECRET, `${username}|${scenarioId}|${correctPlan}`)
//           hex, first 12 chars
//
// Because the token mixes the USERNAME with the scenario's correct plan and a
// server-only FLAG_SECRET, every user gets a different flag for the same
// scenario, and the flag is only computable server-side. The flag is returned
// ONLY when the submitted plan equals the scenario's unique-survivor plan.
// ============================================================================

function flagSecret(): string {
  const s = process.env.FLAG_SECRET;
  if (!s) {
    // Dev fallback so `npm run dev` works without env setup. Production MUST
    // set FLAG_SECRET in Netlify, or all flags become guessable.
    return "DEV_INSECURE_FLAG_SECRET_change_me";
  }
  return s;
}

const KIND_TAG: Record<Scenario["kind"], string> = {
  MISSILE_SITE: "tel",
  DARK_VESSEL: "darkvessel",
};

// Normalize a submitted plan to the canonical "PROVIDER|SENSOR|MINUTES" form.
export function canonicalizeSubmission(
  provider: string,
  sensor: string,
  minutes: string,
): string {
  return `${provider.trim().toUpperCase()}|${sensor.trim().toUpperCase()}|${String(minutes).trim()}`;
}

// The flag for a given user + scenario (computed regardless of correctness —
// callers must gate on a correct submission first).
//
// Practice scenarios are the SAME for everyone, so their flag is NOT keyed by
// username — every operator who solves a practice drill sees the identical
// `CTF{practice_pNN}` token. Scored scenarios stay per-user-unique.
export function flagFor(username: string, scenario: Scenario): string {
  const plan = correctCanonicalPlan(scenario);
  if (!plan) return ""; // misconfigured scenario; build check prevents this
  if (scenario.practice) {
    return `CTF{practice_${scenario.id}_well_flown}`;
  }
  const token = crypto
    .createHmac("sha256", flagSecret())
    .update(`${username}|${scenario.id}|${plan}`)
    .digest("hex")
    .slice(0, 12);
  return `CTF{${KIND_TAG[scenario.kind]}_${scenario.id}_${token}}`;
}

// Returns the user's flag iff the submission matches the correct plan, else "".
export function checkAndFlag(
  username: string,
  scenario: Scenario,
  submission: string,
): string {
  const correct = correctCanonicalPlan(scenario);
  if (!correct) return "";
  // Constant-time compare on the canonical plan strings.
  const a = Buffer.from(submission.toUpperCase());
  const b = Buffer.from(correct.toUpperCase());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "";
  return flagFor(username, scenario);
}
