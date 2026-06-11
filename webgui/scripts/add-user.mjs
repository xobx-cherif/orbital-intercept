// Add (or replace) ONE user with KNOWN credentials, without disturbing the
// existing roster. Unlike gen-roster.mjs (which rotates all 26 passwords), this
// only touches the named user.
//
// Usage:
//   node scripts/add-user.mjs                         -> testuser / testpass123, all 12 scenarios
//   node scripts/add-user.mjs alice S3cret            -> alice / S3cret, all 12 scenarios
//   node scripts/add-user.mjs alice S3cret s01 s05 s09 -> alice with a specific scenario set
//
// IMPORTANT: flags depend on FLAG_SECRET. Run with the SAME FLAG_SECRET you use
// in production so the printed flags match the live site:
//   FLAG_SECRET=<prod-secret> node scripts/add-user.mjs ...
//
// Updates lib/users.data.json (committed; hashes only) and appends the user's
// row to ROSTER.md and credentials.csv (git-ignored handouts).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// ---- args ------------------------------------------------------------------
const [, , argUser, argPass, ...argScenarios] = process.argv;
const username = (argUser || "testuser").trim();
const password = (argPass || "testpass123").trim();

// ---- pull scenario plans from the TS source --------------------------------
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

// chosen scenarios: provided ids (validated) or all 12 by default
let scenarioIds = argScenarios.length ? argScenarios : ALL_IDS;
const unknown = scenarioIds.filter((id) => !planById[id]);
if (unknown.length) {
  console.error(`Unknown scenario id(s): ${unknown.join(", ")}. Valid: ${ALL_IDS.join(", ")}`);
  process.exit(1);
}

// ---- flag derivation (mirror of lib/flag.ts) -------------------------------
const FLAG_SECRET = process.env.FLAG_SECRET || "DEV_INSECURE_FLAG_SECRET_change_me";
const usingDefaultSecret = !process.env.FLAG_SECRET;
function flagFor(user, sc) {
  const token = crypto.createHmac("sha256", FLAG_SECRET).update(`${user}|${sc.id}|${sc.plan}`).digest("hex").slice(0, 12);
  return `CTF{${KIND_TAG[sc.kind]}_${sc.id}_${token}}`;
}

// ---- hash the known password ----------------------------------------------
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, Buffer.from(salt, "hex"), 32).toString("hex");

// ---- load + update users.data.json -----------------------------------------
const dataPath = path.join(root, "lib/users.data.json");
const users = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const idx = users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
const record = { username, salt, hash, scenarios: scenarioIds };
if (idx >= 0) {
  users[idx] = record;
  console.log(`Replaced existing user "${username}".`);
} else {
  users.push(record);
  console.log(`Added new user "${username}".`);
}
fs.writeFileSync(dataPath, JSON.stringify(users, null, 2) + "\n");

// ---- append to handout files (git-ignored) ---------------------------------
const flags = scenarioIds.map((id) => ({ id, codename: planById[id].codename, kind: planById[id].kind, flag: flagFor(username, planById[id]) }));

// ROSTER.md
const rosterPath = path.join(root, "ROSTER.md");
let md = `\n## ${username}  ${usingDefaultSecret ? "(dev FLAG_SECRET)" : ""}\n`;
md += `- **password:** \`${password}\`\n`;
md += `- **scenarios & expected flags:**\n`;
for (const f of flags) md += `  - \`${f.id}\` ${f.codename} (${f.kind}) → \`${f.flag}\`\n`;
fs.appendFileSync(rosterPath, md);

// credentials.csv
const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csvPath = path.join(root, "credentials.csv");
if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, ["username", "password", "scenarios", "flags"].map(csvCell).join(",") + "\n");
}
const csvRow = [username, password, scenarioIds.join(";"), flags.map((f) => f.flag).join(";")].map(csvCell).join(",");
fs.appendFileSync(csvPath, csvRow + "\n");

console.log(`  username : ${username}`);
console.log(`  password : ${password}`);
console.log(`  scenarios: ${scenarioIds.join(", ")}`);
console.log(`Updated lib/users.data.json, ROSTER.md, credentials.csv.`);
if (usingDefaultSecret) console.log("NOTE: dev FLAG_SECRET fallback used — flags match a local dev server only.");
