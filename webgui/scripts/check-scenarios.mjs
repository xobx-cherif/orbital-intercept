// Build-time integrity check: every scenario must have EXACTLY ONE provider
// that clears all five gates. Run with: node scripts/check-scenarios.mjs
// (uses tsx-free pure JS by importing the compiled logic via a tiny re-impl).
//
// To avoid a TS build step, we re-declare the evaluate logic here and import
// the scenario DATA through a JSON snapshot generated from the TS at runtime.
// Simpler: we shell out to the TS via a dynamic import using the Node TS loader
// is overkill — instead we duplicate the (tiny, stable) gate logic and parse
// the scenarios with a lightweight regex-free dynamic import using esbuild-less
// approach: we just import the .ts through Node's experimental stripping if
// available, else fall back. To keep it robust we read via tsx if present.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Run an inline TS evaluation through the project's typescript via a tiny
// ts->js eval using `node --experimental-strip-types` when on Node >= 22,
// otherwise via npx tsx. We detect and pick.
const probe = spawnSync(process.execPath, ["--experimental-strip-types", "-e", "0"], {
  encoding: "utf8",
});
const stripWorks = probe.status === 0;

const runner = `
import { SCENARIOS, PRACTICE_SCENARIOS, evaluate, correctCanonicalPlan } from ${JSON.stringify(path.join(root, "lib/scenarios.ts"))};
let bad = 0;
const checkSet = (label, list) => {
  for (const s of list) {
    const survivors = s.providers.filter((p) => evaluate(p, s.req).ok);
    const ids = survivors.map((p) => p.id).join(", ");
    if (survivors.length !== 1) {
      bad++;
      console.error("FAIL " + s.id + " (" + s.codename + "): " + survivors.length + " survivors [" + ids + "]");
    } else {
      console.log("ok   " + s.id + " (" + s.codename + ") -> " + survivors[0].id + " " + survivors[0].name);
    }
  }
};
checkSet("scored", SCENARIOS);
console.log("--- practice set ---");
checkSet("practice", PRACTICE_SCENARIOS);

// Practice winners must NOT collide with any scored winner (no flag leakage).
const scoredPlans = new Set(SCENARIOS.map((s) => correctCanonicalPlan(s)));
for (const s of PRACTICE_SCENARIOS) {
  const plan = correctCanonicalPlan(s);
  if (scoredPlans.has(plan)) {
    bad++;
    console.error("FAIL " + s.id + ": practice winner plan [" + plan + "] collides with a SCORED scenario answer.");
  }
}

if (bad > 0) { console.error("\\n" + bad + " problem(s) found."); process.exit(1); }
console.log("\\nAll " + SCENARIOS.length + " scored + " + PRACTICE_SCENARIOS.length + " practice scenarios OK; no practice/scored answer collisions.");
`;

let res;
if (stripWorks) {
  res = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", runner], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
} else {
  res = spawnSync("npx", ["--yes", "tsx", "-e", runner], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
}
process.exit(res.status ?? 1);
