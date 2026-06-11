// One-off generator. Creates 26 users with strong passwords, assigns each 4 of
// the 12 scenarios, hashes passwords (scrypt), computes each user's expected
// flags, then writes:
//   lib/users.data.json  — committed: usernames, salts, hashes, assignments
//   ROSTER.md            — git-ignored handout: username, PLAINTEXT password,
//                          assigned scenarios, expected flags
//
// Run:  node scripts/gen-roster.mjs
// Re-running regenerates passwords (and therefore invalidates old logins).
//
// Flag + plan logic is kept identical to lib/flag.ts and lib/scenarios.ts.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// ---- 1. Pull the 12 scenarios' correct canonical plans from the TS source --
function getScenarioPlans() {
  const runner = `
import { SCENARIOS, correctCanonicalPlan } from ${JSON.stringify(path.join(root, "lib/scenarios.ts"))};
const out = SCENARIOS.map((s) => ({ id: s.id, kind: s.kind, codename: s.codename, plan: correctCanonicalPlan(s) }));
process.stdout.write(JSON.stringify(out));
`;
  const probe = spawnSync(process.execPath, ["--experimental-strip-types", "-e", "0"], { encoding: "utf8" });
  const stripWorks = probe.status === 0;
  const res = stripWorks
    ? spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", runner], { cwd: root, encoding: "utf8" })
    : spawnSync("npx", ["--yes", "tsx", "-e", runner], { cwd: root, encoding: "utf8" });
  if (res.status !== 0) {
    console.error(res.stderr || "failed to read scenarios");
    process.exit(1);
  }
  return JSON.parse(res.stdout.trim());
}

const scenarios = getScenarioPlans();
const planById = Object.fromEntries(scenarios.map((s) => [s.id, s]));
const ALL_IDS = scenarios.map((s) => s.id);
const KIND_TAG = { MISSILE_SITE: "tel", DARK_VESSEL: "darkvessel" };

// ---- 2. Flag derivation (mirror of lib/flag.ts) ----------------------------
const FLAG_SECRET = process.env.FLAG_SECRET || "DEV_INSECURE_FLAG_SECRET_change_me";
function flagFor(username, sc) {
  const token = crypto.createHmac("sha256", FLAG_SECRET).update(`${username}|${sc.id}|${sc.plan}`).digest("hex").slice(0, 12);
  return `CTF{${KIND_TAG[sc.kind]}_${sc.id}_${token}}`;
}

// ---- 3. Password generation + hashing --------------------------------------
// Unambiguous alphabet (no 0/O/1/l/I) for read-aloud distribution.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
function genPassword(len = 12) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function hashPassword(password, saltHex) {
  return crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 32).toString("hex");
}

// ---- 4. Deterministic 4-of-12 assignment, evenly spread --------------------
// Rotate a window of 4 across the 12 ids as the user index advances, so usage
// of each scenario is balanced across the 26 users.
function assignFour(index) {
  const ids = [];
  for (let k = 0; k < 4; k++) ids.push(ALL_IDS[(index * 4 + k * 1 + index) % ALL_IDS.length]);
  // de-dup defensively (rotation above can't collide for these sizes, but be safe)
  const uniq = [...new Set(ids)];
  let probe = 0;
  while (uniq.length < 4) {
    const cand = ALL_IDS[(index + probe) % ALL_IDS.length];
    if (!uniq.includes(cand)) uniq.push(cand);
    probe++;
  }
  return uniq.slice(0, 4);
}

// ---- 5. Build the 26 users -------------------------------------------------
const N = 26;
const stored = [];
const roster = [];
for (let i = 0; i < N; i++) {
  const username = `operator${String(i + 1).padStart(2, "0")}`;
  const password = genPassword(12);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const scenarioIds = assignFour(i);

  stored.push({ username, salt, hash, scenarios: scenarioIds });
  roster.push({
    username,
    password,
    scenarios: scenarioIds.map((id) => {
      const sc = planById[id];
      return { id, codename: sc.codename, kind: sc.kind, flag: flagFor(username, sc) };
    }),
  });
}

// ---- 6. Write users.data.json (safe to commit) -----------------------------
fs.writeFileSync(path.join(root, "lib/users.data.json"), JSON.stringify(stored, null, 2) + "\n");

// ---- 7. Write ROSTER.md (git-ignored handout) ------------------------------
const usingDefaultSecret = !process.env.FLAG_SECRET;
let md = `# Orbital Intercept — Instructor Roster (CONFIDENTIAL)\n\n`;
md += `Generated ${new Date().toISOString()} · ${N} users · 4 scenarios each · 2 attempts per scenario.\n\n`;
if (usingDefaultSecret) {
  md += `> ⚠️  Generated with the DEV fallback FLAG_SECRET. The flags below match a\n`;
  md += `> local dev server. For your deployed Netlify site, set FLAG_SECRET in the\n`;
  md += `> site env vars and **re-run this generator with the same FLAG_SECRET** so\n`;
  md += `> these flags match production.\n\n`;
}
md += `Do NOT commit this file. It is listed in .gitignore.\n\n`;
for (const u of roster) {
  md += `## ${u.username}\n`;
  md += `- **password:** \`${u.password}\`\n`;
  md += `- **scenarios & expected flags:**\n`;
  for (const s of u.scenarios) {
    md += `  - \`${s.id}\` ${s.codename} (${s.kind}) → \`${s.flag}\`\n`;
  }
  md += `\n`;
}
fs.writeFileSync(path.join(root, "ROSTER.md"), md);

// ---- 8. Write credentials.csv (git-ignored handout) ------------------------
// One row per user. Scenarios + flags are semicolon-separated within a cell so
// the file stays a clean username/password credentials sheet.
const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csvRows = [
  ["username", "password", "scenarios", "flags"].map(csvCell).join(","),
];
for (const u of roster) {
  csvRows.push(
    [
      u.username,
      u.password,
      u.scenarios.map((s) => s.id).join(";"),
      u.scenarios.map((s) => s.flag).join(";"),
    ]
      .map(csvCell)
      .join(","),
  );
}
fs.writeFileSync(path.join(root, "credentials.csv"), csvRows.join("\n") + "\n");

console.log(`Wrote lib/users.data.json (${N} users), ROSTER.md, and credentials.csv`);
if (usingDefaultSecret) console.log("NOTE: used dev FLAG_SECRET fallback — see ROSTER.md warning.");
