// ============================================================================
// SCENARIO ENGINE  —  client-safe (no flag secret, no answers stored as flags)
//
// The puzzle is unchanged: each scenario gives mission REQUIREMENTS (5 gates)
// and a CATALOG of satellite providers. Exactly ONE provider clears every gate.
// The "correct plan" is the unique survivor, recomputed by evaluate() — it is
// NOT written down here, so the file can ship to the browser safely. The
// per-user FLAG is what's protected (see lib/flag.ts, server-only).
//
// THEME: fictional Iran–UAE conflict training set. Two mission families —
//   MISSILE_SITE : image a TEL / launch site before a strike window
//   DARK_VESSEL  : find an AIS-off vessel running weapons through the strait
// All names, units and intel are invented for the exercise.
// ============================================================================

export type Provider = {
  id: string;
  name: string;
  sensor: "OPTICAL" | "SAR";
  mode: string;
  resolution_m: number;
  reliability: number;
  swath_km: number;
  day_night: "DAY-ONLY" | "ALL-WEATHER";
  cloud_penetration: boolean;
  max_off_nadir_deg: number;
  tasking: number;
  access: number;
  acquisition: number;
  downlink: number;
  processing: number;
  notes: string;
};

export type Req = {
  needs_all_weather: boolean;
  max_resolution_m: number;
  min_reliability: number;
  min_off_nadir_deg: number;
  deadline_min: number;
};

export type Fact = { icon: string; title: string; text: string };

export type Scenario = {
  id: string; // "s01".."s12" (scored) or "p01".. (practice)
  codename: string;
  kind: "MISSILE_SITE" | "DARK_VESSEL";
  windowLabel: string; // e.g. "T-6:00:00"
  intel: string;
  facts: Fact[];
  mission: string;
  req: Req;
  providers: Provider[]; // exactly one clears every gate
  practice?: boolean; // shared training set; unlimited attempts, not scored
};

export const PIPELINE_STAGES = [
  "tasking",
  "access",
  "acquisition",
  "downlink",
  "processing",
] as const;

export function totalPipeline(p: Provider): number {
  return PIPELINE_STAGES.reduce((sum, s) => sum + p[s], 0);
}

export type GateResult = { ok: boolean; fails: string[] };

export function evaluate(p: Provider, req: Req): GateResult {
  const fails: string[] = [];
  if (req.needs_all_weather && !p.cloud_penetration)
    fails.push("SENSOR — optical is blind at night / through cloud");
  if (p.resolution_m > req.max_resolution_m)
    fails.push(
      `RESOLUTION — ${p.resolution_m.toFixed(1)} m > ${req.max_resolution_m.toFixed(1)} m`,
    );
  if (p.reliability < req.min_reliability)
    fails.push(
      `RELIABILITY — ${p.reliability.toFixed(2)} < ${req.min_reliability.toFixed(2)}`,
    );
  if (p.max_off_nadir_deg < req.min_off_nadir_deg)
    fails.push(
      `GEOMETRY — max off-nadir ${p.max_off_nadir_deg}° < ${req.min_off_nadir_deg}° to reach target`,
    );
  const tot = totalPipeline(p);
  if (tot > req.deadline_min)
    fails.push(`DEADLINE — ${tot} min > ${req.deadline_min} min`);
  return { ok: fails.length === 0, fails };
}

// ----------------------------------------------------------------------------
// CONSTELLATION — the recurring commercial/national providers a tasking officer
// can call on. Stable specs; missions differ in what they require.
// ----------------------------------------------------------------------------
const SATS: Record<string, Provider> = {
  BLUEEYE: {
    id: "SAT-01", name: "BlueEye-Optical",
    sensor: "OPTICAL", mode: "Pushbroom", resolution_m: 0.5,
    reliability: 0.92, swath_km: 12, day_night: "DAY-ONLY",
    cloud_penetration: false, max_off_nadir_deg: 30,
    tasking: 20, access: 90, acquisition: 2, downlink: 35, processing: 45,
    notes: "Best-in-class GSD. Useless through cloud or at night.",
  },
  ORBVIEW: {
    id: "SAT-02", name: "OrbView-Optical",
    sensor: "OPTICAL", mode: "Agile-stare", resolution_m: 0.3,
    reliability: 0.88, swath_km: 8, day_night: "DAY-ONLY",
    cloud_penetration: false, max_off_nadir_deg: 45,
    tasking: 25, access: 70, acquisition: 3, downlink: 30, processing: 50,
    notes: "Sharpest optic available. Still blind through overcast.",
  },
  SUNSPEAR: {
    id: "SAT-03", name: "SunSpear-Optical",
    sensor: "OPTICAL", mode: "Agile-stare", resolution_m: 0.4,
    reliability: 0.95, swath_km: 10, day_night: "DAY-ONLY",
    cloud_penetration: false, max_off_nadir_deg: 40,
    tasking: 18, access: 60, acquisition: 2, downlink: 25, processing: 40,
    notes: "Fast, reliable daylight optic. Needs clear sky and sun.",
  },
  IRONCLOUD: {
    id: "SAT-04", name: "IronCloud-SAR",
    sensor: "SAR", mode: "Stripmap", resolution_m: 3.0,
    reliability: 0.94, swath_km: 30, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 20,
    tasking: 20, access: 120, acquisition: 6, downlink: 30, processing: 40,
    notes: "Rock-solid all-weather wide search; 3 m GSD can't resolve class. Slews only 20°.",
  },
  NIGHTHAWK: {
    id: "SAT-05", name: "NightHawk-SAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.8,
    reliability: 0.91, swath_km: 5, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 45,
    tasking: 30, access: 180, acquisition: 4, downlink: 40, processing: 60,
    notes: "Sub-metre spotlight SAR through cloud and dark; agile 45° gimbal.",
  },
  POLARSAR: {
    id: "SAT-06", name: "PolarSAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.6,
    reliability: 0.79, swath_km: 6, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 40,
    tasking: 25, access: 150, acquisition: 4, downlink: 35, processing: 55,
    notes: "Great GSD, but reliability has been slipping below trust threshold.",
  },
  RAPIDSAR: {
    id: "SAT-07", name: "RapidSAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.9,
    reliability: 0.9, swath_km: 5, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 40,
    tasking: 25, access: 250, acquisition: 5, downlink: 60, processing: 90,
    notes: "Capable, but distant next-access and long downlink blow most clocks.",
  },
  SANDVIPER: {
    id: "SAT-08", name: "SandViper-SAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.7,
    reliability: 0.93, swath_km: 7, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 38,
    tasking: 22, access: 110, acquisition: 4, downlink: 30, processing: 44,
    notes: "Reliable regional spotlight SAR with a quick revisit over the Gulf.",
  },
  DUNEWATCH: {
    id: "SAT-09", name: "DuneWatch-SAR",
    sensor: "SAR", mode: "Stripmap", resolution_m: 1.2,
    reliability: 0.96, swath_km: 22, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 25,
    tasking: 18, access: 95, acquisition: 5, downlink: 28, processing: 38,
    notes: "Very reliable, fast wide-area mapper; 1.2 m GSD, modest slew.",
  },
  GULFSTARE: {
    id: "SAT-10", name: "GulfStare-SAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.5,
    reliability: 0.86, swath_km: 6, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 50,
    tasking: 28, access: 160, acquisition: 5, downlink: 38, processing: 58,
    notes: "Extreme 50° slew and fine GSD; slower pipeline and middling reliability.",
  },
  FALCONX: {
    id: "SAT-11", name: "FalconSAR-X",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.45,
    reliability: 0.88, swath_km: 6, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 42,
    tasking: 26, access: 140, acquisition: 4, downlink: 36, processing: 52,
    notes: "Very fine GSD and good slew; reliability just inside most gates.",
  },
  ABYSSSAR: {
    id: "SAT-12", name: "AbyssSAR",
    sensor: "SAR", mode: "Spotlight", resolution_m: 0.55,
    reliability: 0.84, swath_km: 6, day_night: "ALL-WEATHER",
    cloud_penetration: true, max_off_nadir_deg: 36,
    tasking: 24, access: 130, acquisition: 4, downlink: 34, processing: 50,
    notes: "Fine GSD, moderate slew; reliability sits near the low trust line.",
  },
};

const pick = (...keys: (keyof typeof SATS)[]) => keys.map((k) => SATS[k]);

// ----------------------------------------------------------------------------
// 12 SCENARIOS. Intended unique winner noted in a comment; verified at build
// time by scripts/check-scenarios.mjs (exactly one survivor each).
// ----------------------------------------------------------------------------
export const SCENARIOS: Scenario[] = [
  // ---- S01 — winner NIGHTHAWK ---------------------------------------------
  {
    id: "s01",
    codename: "DESERT FULCRUM",
    kind: "MISSILE_SITE",
    windowLabel: "T-6:00:00",
    intel:
      "A transporter-erector-launcher (TEL) has been reported dispersing to a hide site in the interior. It will be exposed for roughly 6 hours before it rolls back under cover.",
    facts: [
      { icon: "☾", title: "NIGHT + THICK CLOUD", text: "Local night under a stalled cloud deck. Optical sensors return nothing usable." },
      { icon: "⊹", title: "CONFIRM TEL CLASS", text: "Analysts must read the canister layout — finer than 1.0 m GSD required." },
      { icon: "∡", title: "OFF-TRACK HIDE", text: "The wadi lies well off the ground track; the sensor must slew ≥ 35° off-nadir." },
    ],
    mission:
      "Eliminate providers that fail any hard gate, pick the one that clears every constraint and beats the 6-hour clock, then transmit the tasking plan.",
    req: { needs_all_weather: true, max_resolution_m: 1.0, min_reliability: 0.85, min_off_nadir_deg: 35, deadline_min: 360 },
    providers: pick("BLUEEYE", "ORBVIEW", "SUNSPEAR", "IRONCLOUD", "NIGHTHAWK", "POLARSAR"),
  },

  // ---- S02 — winner SANDVIPER ---------------------------------------------
  {
    id: "s02",
    codename: "SILENT DHOW",
    kind: "DARK_VESSEL",
    windowLabel: "T-4:00:00",
    intel:
      "A dhow has gone dark — AIS transponder off — after loading at a small creek. It is expected to clear the inshore lane within 4 hours, after which it merges with dense traffic.",
    facts: [
      { icon: "☁", title: "OVERCAST DAY", text: "Heavy cloud over the lane. Imagery must be all-weather to see the hull." },
      { icon: "⊹", title: "DECK CARGO ID", text: "Must resolve crates on deck — finer than 1.0 m GSD." },
      { icon: "⏱", title: "TIGHT CLOCK", text: "Product needed in ≤ 240 min before it reaches open water." },
    ],
    mission:
      "Find the single provider that is all-weather, sharp enough to read the deck, trusted, and fast enough for the 4-hour window.",
    req: { needs_all_weather: true, max_resolution_m: 1.0, min_reliability: 0.85, min_off_nadir_deg: 35, deadline_min: 240 },
    providers: pick("IRONCLOUD", "POLARSAR", "RAPIDSAR", "SANDVIPER", "DUNEWATCH", "GULFSTARE"),
  },

  // ---- S03 — winner GULFSTARE (extreme slew) ------------------------------
  {
    id: "s03",
    codename: "STEEP ANGLE",
    kind: "MISSILE_SITE",
    windowLabel: "T-5:00:00",
    intel:
      "A launch rail is being assembled deep inside a coastal exclusion zone our orbits only graze. The geometry is brutal: the target sits far to the side of every usable pass.",
    facts: [
      { icon: "∡", title: "EXTREME OFF-TRACK", text: "Target is far off the ground track — the sensor must slew ≥ 48° off-nadir." },
      { icon: "☾", title: "NIGHT TASKING", text: "Night and haze over the coast; all-weather sensing only." },
      { icon: "⊹", title: "RAIL DETAIL", text: "Finer than 1.0 m GSD to confirm the rail assembly." },
    ],
    mission:
      "Only one provider can both reach this steep look-angle and clear the other gates. Identify it and task it.",
    req: { needs_all_weather: true, max_resolution_m: 1.0, min_reliability: 0.8, min_off_nadir_deg: 48, deadline_min: 300 },
    providers: pick("NIGHTHAWK", "POLARSAR", "SANDVIPER", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S04 — winner SUNSPEAR (daylight, clear sky — OPTICAL!) --------------
  {
    id: "s04",
    codename: "CLEAR HORIZON",
    kind: "DARK_VESSEL",
    windowLabel: "T-2:40:00",
    intel:
      "A weapons transfer is suspected dockside in broad daylight under a rare clear sky. Optical detail beats radar here — but the window is very short and the sky won't last.",
    facts: [
      { icon: "☀", title: "CLEAR DAYLIGHT", text: "Bright clear sky — optical is viable and gives the finest detail." },
      { icon: "⊹", title: "FINE DETAIL", text: "Must read serial markings — finer than 0.45 m GSD." },
      { icon: "⏱", title: "VERY TIGHT CLOCK", text: "Finished product in ≤ 160 min before the transfer ends." },
    ],
    mission:
      "All-weather is NOT required this time. Find the sharp, fast, trusted optic that beats the short clock and the off-track angle.",
    req: { needs_all_weather: false, max_resolution_m: 0.45, min_reliability: 0.9, min_off_nadir_deg: 38, deadline_min: 160 },
    providers: pick("BLUEEYE", "ORBVIEW", "SUNSPEAR", "IRONCLOUD", "SANDVIPER"),
  },

  // ---- S05 — winner FALCONX -----------------------------------------------
  {
    id: "s05",
    codename: "RAZOR EDGE",
    kind: "MISSILE_SITE",
    windowLabel: "T-5:00:00",
    intel:
      "A camouflaged launcher needs the sharpest possible radar image to separate it from decoys, while reliability still has to clear the trust line.",
    facts: [
      { icon: "⊹", title: "SUB-0.5 m GSD", text: "Decoy discrimination needs finer than 0.5 m GSD." },
      { icon: "✓", title: "TRUST LINE", text: "Reliability must be ≥ 0.87 — a dropped tasking loses the target." },
      { icon: "∡", title: "OFF-TRACK", text: "Slew ≥ 40° off-nadir to frame the revetment." },
    ],
    mission:
      "Balance the finest GSD against the reliability and geometry gates. Exactly one all-weather provider fits inside the 300-minute clock.",
    req: { needs_all_weather: true, max_resolution_m: 0.5, min_reliability: 0.87, min_off_nadir_deg: 40, deadline_min: 300 },
    providers: pick("NIGHTHAWK", "POLARSAR", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S06 — winner ABYSSSAR ----------------------------------------------
  {
    id: "s06",
    codename: "LOW TIDE",
    kind: "DARK_VESSEL",
    windowLabel: "T-4:10:00",
    intel:
      "A low-freeboard craft is slipping between sandbars at night. You need decent detail fast; the better-spec birds are either too slow or too far off in their next pass.",
    facts: [
      { icon: "☾", title: "NIGHT RUN", text: "Night transit under cloud — all-weather only." },
      { icon: "⊹", title: "HULL DETAIL", text: "Finer than 0.6 m GSD to classify the craft." },
      { icon: "⏱", title: "TIGHT-ISH CLOCK", text: "Finished product in ≤ 250 min." },
    ],
    mission:
      "The sharpest birds miss the clock or the angle. Find the one all-weather provider that fits every gate inside 250 minutes.",
    req: { needs_all_weather: true, max_resolution_m: 0.6, min_reliability: 0.8, min_off_nadir_deg: 35, deadline_min: 250 },
    providers: pick("NIGHTHAWK", "POLARSAR", "SANDVIPER", "FALCONX", "ABYSSSAR"),
  },

  // ---- S07 — winner DUNEWATCH (wide-area, high reliability) ----------------
  {
    id: "s07",
    codename: "BROAD SWEEP",
    kind: "MISSILE_SITE",
    windowLabel: "T-3:20:00",
    intel:
      "Intel is fuzzy on exactly where the launchers dispersed across a wide desert grid. You need a fast, dead-reliable wide-area sweep to localize them — fine GSD is secondary right now.",
    facts: [
      { icon: "▦", title: "WIDE AREA", text: "Cover a large grid quickly; moderate GSD (≤ 1.5 m) is acceptable." },
      { icon: "✓", title: "MUST NOT MISS", text: "Reliability ≥ 0.95 — this localization pass cannot fail." },
      { icon: "⏱", title: "FAST", text: "Finished product in ≤ 200 min." },
    ],
    mission:
      "Detail matters less than reliability and speed here. Find the one provider that is wide, fast, and the most trusted.",
    req: { needs_all_weather: true, max_resolution_m: 1.5, min_reliability: 0.95, min_off_nadir_deg: 25, deadline_min: 200 },
    providers: pick("IRONCLOUD", "NIGHTHAWK", "SANDVIPER", "DUNEWATCH", "ABYSSSAR"),
  },

  // ---- S08 — winner NIGHTHAWK (different set) ------------------------------
  {
    id: "s08",
    codename: "NIGHT CANOPY",
    kind: "MISSILE_SITE",
    windowLabel: "T-6:00:00",
    intel:
      "A launcher is parked under a netted canopy at night. You need sub-metre radar and a steep look to peer under the netting, with reliability above the strike-support line.",
    facts: [
      { icon: "☾", title: "NIGHT + COVER", text: "Netted hide at night — all-weather, sub-metre radar required." },
      { icon: "✓", title: "STRIKE-SUPPORT TRUST", text: "Reliability ≥ 0.90 to support a strike decision." },
      { icon: "∡", title: "PEER UNDER NET", text: "Slew ≥ 44° off-nadir for the look-under angle." },
    ],
    mission:
      "Sub-metre GSD, high trust, and a steep angle inside 6 hours — only one provider satisfies all three.",
    req: { needs_all_weather: true, max_resolution_m: 0.8, min_reliability: 0.9, min_off_nadir_deg: 44, deadline_min: 360 },
    providers: pick("NIGHTHAWK", "RAPIDSAR", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S09 — winner SANDVIPER (fast regional, distractors slow) -----------
  {
    id: "s09",
    codename: "QUICK REVISIT",
    kind: "DARK_VESSEL",
    windowLabel: "T-3:40:00",
    intel:
      "A go-fast boat just left a jetty and will be hard to reacquire. You have a very short window and need a trusted regional bird with a quick revisit.",
    facts: [
      { icon: "☁", title: "ALL-WEATHER", text: "Squalls over the approach — all-weather only." },
      { icon: "⊹", title: "BOAT CLASS", text: "Finer than 1.0 m GSD to classify the hull." },
      { icon: "⏱", title: "VERY SHORT WINDOW", text: "Finished product in ≤ 220 min." },
    ],
    mission:
      "The high-slew and high-detail birds are all too slow for this clock. Find the fast, trusted regional provider that still clears every gate.",
    req: { needs_all_weather: true, max_resolution_m: 1.0, min_reliability: 0.9, min_off_nadir_deg: 35, deadline_min: 220 },
    providers: pick("POLARSAR", "RAPIDSAR", "SANDVIPER", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S10 — winner FALCONX (fine GSD, mid clock) -------------------------
  {
    id: "s10",
    codename: "FINE PRINT",
    kind: "DARK_VESSEL",
    windowLabel: "T-4:30:00",
    intel:
      "A mother-ship is transferring containers at anchor. You must read container markings through cloud, with a sensor trusted above the standard line.",
    facts: [
      { icon: "⊹", title: "READ MARKINGS", text: "Finer than 0.5 m GSD to read container markings." },
      { icon: "☁", title: "ALL-WEATHER", text: "Cloud over the anchorage — radar required." },
      { icon: "✓", title: "TRUST LINE", text: "Reliability ≥ 0.87; product in ≤ 270 min." },
    ],
    mission:
      "Only one all-weather provider is sharp enough, trusted enough, and inside the 270-minute clock at the required slew.",
    req: { needs_all_weather: true, max_resolution_m: 0.5, min_reliability: 0.87, min_off_nadir_deg: 40, deadline_min: 270 },
    providers: pick("NIGHTHAWK", "POLARSAR", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S11 — winner GULFSTARE (steep + fine, slow ok) ---------------------
  {
    id: "s11",
    codename: "OBLIQUE LOOK",
    kind: "MISSILE_SITE",
    windowLabel: "T-5:30:00",
    intel:
      "A launcher is tucked against a cliff that shadows shallow look-angles. Only a very steep, very sharp radar look will see into the niche — you have a little more time than usual.",
    facts: [
      { icon: "∡", title: "VERY STEEP LOOK", text: "Slew ≥ 46° off-nadir to see past the cliff shadow." },
      { icon: "⊹", title: "FINE GSD", text: "Finer than 0.55 m GSD to confirm the launcher." },
      { icon: "☾", title: "NIGHT", text: "Night and dust — all-weather only; up to 330 min available." },
    ],
    mission:
      "Steep angle and fine GSD together rule out almost everyone. Find the single provider that satisfies both inside the clock.",
    req: { needs_all_weather: true, max_resolution_m: 0.55, min_reliability: 0.8, min_off_nadir_deg: 46, deadline_min: 330 },
    providers: pick("NIGHTHAWK", "POLARSAR", "GULFSTARE", "FALCONX", "ABYSSSAR"),
  },

  // ---- S12 — winner DUNEWATCH (wide + very fast) --------------------------
  {
    id: "s12",
    codename: "FIRST LIGHT",
    kind: "DARK_VESSEL",
    windowLabel: "T-3:10:00",
    intel:
      "Multiple small craft scattered after a tip-off. You need an extremely fast, dead-reliable wide sweep to relocate the cluster before they disperse into harbors.",
    facts: [
      { icon: "▦", title: "WIDE + FAST", text: "Wide-area relocation; moderate GSD (≤ 1.5 m) acceptable." },
      { icon: "✓", title: "DEAD RELIABLE", text: "Reliability ≥ 0.95 — no second chance." },
      { icon: "⏱", title: "EXTREME CLOCK", text: "Finished product in ≤ 190 min." },
    ],
    mission:
      "Speed and reliability dominate. Find the one provider wide enough, trusted enough, and fast enough for the 3-hour clock.",
    req: { needs_all_weather: true, max_resolution_m: 1.5, min_reliability: 0.95, min_off_nadir_deg: 25, deadline_min: 190 },
    providers: pick("IRONCLOUD", "NIGHTHAWK", "SANDVIPER", "DUNEWATCH", "FALCONX"),
  },
];

// ----------------------------------------------------------------------------
// PRACTICE SET — the SAME for every operator, separate from the scored 12.
// Unlimited attempts, never scored, and the winners are deliberately drawn from
// providers that are NEVER a correct answer in the scored set (SAT-01 BlueEye,
// SAT-04 IronCloud, SAT-06 PolarSAR), so practising can't leak a real flag.
// ----------------------------------------------------------------------------
export const PRACTICE_SCENARIOS: Scenario[] = [
  // ---- P01 — winner BLUEEYE (SAT-01, OPTICAL) — daylight teaching case -----
  {
    id: "p01",
    codename: "TRAINING: DAYLIGHT PROOF",
    kind: "DARK_VESSEL",
    windowLabel: "PRACTICE",
    intel:
      "TRAINING SCENARIO. A vessel is moored in a calm harbour at midday under a clear sky. This is a warm-up: when the sky is clear and it's daylight, an optical sensor gives the sharpest image — all-weather radar is NOT required.",
    facts: [
      { icon: "☀", title: "CLEAR DAYLIGHT", text: "Bright clear sky — optical is allowed and is sharpest. All-weather not required." },
      { icon: "⊹", title: "READ THE DECK", text: "Finer than 0.6 m GSD to read the deck." },
      { icon: "∡", title: "NEAR TRACK", text: "Target is close to the ground track — only ≤ 30° slew needed." },
    ],
    mission:
      "Practice: with all-weather OFF, find the sharp, trusted daylight optic that fits the gentle off-nadir and the generous clock.",
    req: { needs_all_weather: false, max_resolution_m: 0.6, min_reliability: 0.9, min_off_nadir_deg: 28, deadline_min: 200 },
    providers: pick("BLUEEYE", "ORBVIEW", "IRONCLOUD", "NIGHTHAWK"),
    practice: true,
  },

  // ---- P02 — winner IRONCLOUD (SAT-04, SAR) — wide-area teaching case ------
  {
    id: "p02",
    codename: "TRAINING: WIDE SWEEP",
    kind: "MISSILE_SITE",
    windowLabel: "PRACTICE",
    intel:
      "TRAINING SCENARIO. You only need to LOCATE activity across a big area at night, not identify fine detail. Here a coarse, super-reliable, wide all-weather mapper wins — resolution matters less than coverage and trust.",
    facts: [
      { icon: "▦", title: "WIDE AREA", text: "Cover a big grid; coarse GSD (≤ 3.0 m) is fine for locating." },
      { icon: "☾", title: "NIGHT + CLOUD", text: "Night under cloud — all-weather sensing required." },
      { icon: "∡", title: "NEAR TRACK", text: "Target near the ground track — only ≤ 20° slew needed." },
    ],
    mission:
      "Practice: detail is secondary. Find the wide, all-weather, most-reliable mapper that beats the clock at a gentle look-angle.",
    req: { needs_all_weather: true, max_resolution_m: 3.0, min_reliability: 0.94, min_off_nadir_deg: 18, deadline_min: 240 },
    providers: pick("IRONCLOUD", "POLARSAR", "BLUEEYE", "NIGHTHAWK"),
    practice: true,
  },

  // ---- P03 — winner POLARSAR (SAT-06, SAR) — low-reliability teaching case -
  {
    id: "p03",
    codename: "TRAINING: STEEP & SHARP",
    kind: "MISSILE_SITE",
    windowLabel: "PRACTICE",
    intel:
      "TRAINING SCENARIO. This one teaches reading the reliability gate carefully. The target needs a steep, sharp radar look at night, and the reliability floor is LOW — so a fine-GSD bird with a slipping reliability score is still acceptable here.",
    facts: [
      { icon: "∡", title: "STEEP LOOK", text: "Slew ≥ 40° off-nadir to frame the target." },
      { icon: "⊹", title: "FINE GSD", text: "Finer than 0.7 m GSD." },
      { icon: "✓", title: "LOW TRUST FLOOR", text: "Reliability only needs ≥ 0.78 in this drill." },
    ],
    mission:
      "Practice: with a low reliability floor, the fine-GSD steep-slew SAR that's normally 'too unreliable' is exactly the answer. Find it.",
    req: { needs_all_weather: true, max_resolution_m: 0.7, min_reliability: 0.78, min_off_nadir_deg: 40, deadline_min: 280 },
    providers: pick("POLARSAR", "IRONCLOUD", "SANDVIPER", "BLUEEYE"),
    practice: true,
  },
];

const ALL = [...SCENARIOS, ...PRACTICE_SCENARIOS];

export function getScenario(id: string): Scenario | undefined {
  return ALL.find((s) => s.id === id);
}

// The unique survivor of a scenario (the correct provider). Pure; usable on
// client (to render) and server (to derive the flag). Returns null if not
// exactly one survivor — which the build-time check forbids.
export function findSurvivor(s: Scenario): Provider | null {
  const survivors = s.providers.filter((p) => evaluate(p, s.req).ok);
  return survivors.length === 1 ? survivors[0] : null;
}

// Canonical correct plan string "PROVIDER|SENSOR|MINUTES" (matches the legacy
// format used by lib/flag.ts and the Python reference).
export function correctCanonicalPlan(s: Scenario): string | null {
  const w = findSurvivor(s);
  if (!w) return null;
  return `${w.id}|${w.sensor}|${totalPipeline(w)}`;
}
