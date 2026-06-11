#!/usr/bin/env python3
"""
ORBITAL INTERCEPT — Satellite Tasking CTF
==========================================
A decision-under-constraints challenge. You are the imagery tasking officer.
Fresh intel just landed, the window is short, and you must task the ONE
satellite provider whose sensor, quality, and reliability fit the target while
your whole processing pipeline still beats the deadline.

Run:  python3 orbital_intercept.py
Solve the chain and the system will derive your flag.
"""

import hashlib
import sys
import textwrap

# --------------------------------------------------------------------------
# Encrypted flag. The plaintext is NEVER stored. The key is derived from the
# canonical correct interception plan ("PROVIDER|SENSOR|TOTALMINUTES"). Submit
# the right plan and the keystream regenerates, decrypting the flag in-place.
# --------------------------------------------------------------------------
FLAG_CT_HEX = "be8ddecba65bd2cc75f5fa192d41192eb01bc8074fd14d7a2f05d57f6e22eb3bc2e411bcfac978902b890bf785"


def _keystream(key: bytes, n: int) -> bytes:
    out, c = b"", 0
    while len(out) < n:
        out += hashlib.sha256(key + c.to_bytes(4, "big")).digest()
        c += 1
    return out[:n]


def derive_flag(canonical_plan: str) -> str:
    key = hashlib.sha256(canonical_plan.upper().encode()).digest()
    ct = bytes.fromhex(FLAG_CT_HEX)
    pt = bytes(a ^ b for a, b in zip(ct, _keystream(key, len(ct))))
    try:
        text = pt.decode()
    except UnicodeDecodeError:
        return ""
    return text if text.startswith("CTF{") and text.endswith("}") else ""


# --------------------------------------------------------------------------
# PROVIDER CATALOG
# Each provider is a constellation you can task. Times are in minutes.
#   total_pipeline = tasking + access + acquisition + downlink + processing
# --------------------------------------------------------------------------
PROVIDERS = [
    {
        "id": "SAT-01", "name": "BlueEye-Optical",
        "sensor": "OPTICAL", "mode": "Pushbroom", "resolution_m": 0.5,
        "reliability": 0.92, "swath_km": 12, "day_night": "DAY-ONLY",
        "cloud_penetration": False, "max_off_nadir_deg": 30,
        "tasking": 20, "access": 90, "acquisition": 2, "downlink": 35, "processing": 45,
        "notes": "Best-in-class GSD. Useless through cloud or at night.",
    },
    {
        "id": "SAT-02", "name": "OrbView-Optical",
        "sensor": "OPTICAL", "mode": "Agile-stare", "resolution_m": 0.3,
        "reliability": 0.88, "swath_km": 8, "day_night": "DAY-ONLY",
        "cloud_penetration": False, "max_off_nadir_deg": 45,
        "tasking": 25, "access": 70, "acquisition": 3, "downlink": 30, "processing": 50,
        "notes": "Sharpest optic available. Still blind through monsoon overcast.",
    },
    {
        "id": "SAT-03", "name": "IronCloud-SAR",
        "sensor": "SAR", "mode": "Stripmap", "resolution_m": 3.0,
        "reliability": 0.94, "swath_km": 30, "day_night": "ALL-WEATHER",
        "cloud_penetration": True, "max_off_nadir_deg": 20,
        "tasking": 20, "access": 120, "acquisition": 6, "downlink": 30, "processing": 40,
        "notes": "Rock-solid, all-weather, but 3 m GSD cannot resolve vessel class. "
                 "Wide stripmap can only slew 20 deg off-nadir.",
    },
    {
        "id": "SAT-04", "name": "NightHawk-SAR",
        "sensor": "SAR", "mode": "Spotlight", "resolution_m": 0.8,
        "reliability": 0.91, "swath_km": 5, "day_night": "ALL-WEATHER",
        "cloud_penetration": True, "max_off_nadir_deg": 45,
        "tasking": 30, "access": 180, "acquisition": 4, "downlink": 40, "processing": 60,
        "notes": "Sub-metre spotlight SAR. Sees through cloud and dark. "
                 "Agile gimbal slews to 45 deg off-nadir.",
    },
    {
        "id": "SAT-05", "name": "PolarSAR",
        "sensor": "SAR", "mode": "Spotlight", "resolution_m": 0.6,
        "reliability": 0.79, "swath_km": 6, "day_night": "ALL-WEATHER",
        "cloud_penetration": True, "max_off_nadir_deg": 40,
        "tasking": 25, "access": 150, "acquisition": 4, "downlink": 35, "processing": 55,
        "notes": "Great GSD, but reliability score has been slipping (tasking drops).",
    },
    {
        "id": "SAT-06", "name": "RapidSAR",
        "sensor": "SAR", "mode": "Spotlight", "resolution_m": 0.9,
        "reliability": 0.90, "swath_km": 5, "day_night": "ALL-WEATHER",
        "cloud_penetration": True, "max_off_nadir_deg": 40,
        "tasking": 25, "access": 250, "acquisition": 5, "downlink": 60, "processing": 90,
        "notes": "Capable, but its next access window and long downlink blow the clock.",
    },
]

# --------------------------------------------------------------------------
# INTEL-DERIVED MISSION REQUIREMENTS
# --------------------------------------------------------------------------
REQ = {
    "needs_all_weather": True,    # target is at night, under persistent cloud
    "max_resolution_m": 1.0,      # must resolve vessel class
    "min_reliability": 0.85,      # below this, tasking is not trusted
    "deadline_min": 360,          # 6h before target departs coverage
    "min_off_nadir_deg": 35,      # target is off the ground track; must slew to reach it
}

PIPELINE_STAGES = ("tasking", "access", "acquisition", "downlink", "processing")


def total_pipeline(p) -> int:
    return sum(p[s] for s in PIPELINE_STAGES)


# --------------------------------------------------------------------------
# Presentation helpers
# --------------------------------------------------------------------------
def wrap(s, w=74):
    return "\n".join(textwrap.fill(line, w) for line in s.splitlines())


BRIEF = """\
================================================================================
                        OPERATION ORBITAL INTERCEPT
                        TASKING ORDER // EYES ONLY
================================================================================

INTEL SUMMARY
-------------
A HUMINT source reports that a vessel of interest, the cargo runner "GREY
PETREL", will transit the southern approach channel within the next 6 hours.
The source's window is firm: after that, the vessel leaves our coverage arc.

Two facts dominate the tasking decision:

  * It is local NIGHT over the target box, and a seasonal MONSOON system has
    laid down PERSISTENT, THICK CLOUD over the channel. Optical sensors will
    return nothing usable.

  * We must positively identify the VESSEL CLASS from deck layout. Analysts
    need finer than 1.0 m ground sample distance (GSD) to do that.

  * The channel lies well OFF the ground track of the next passes. To put the
    target in frame, the provider must be able to slew at least 35 deg
    OFF-NADIR. Inflexible wide-swath sensors simply cannot point that far.

We will only act on a provider whose RELIABILITY SCORE is at least 0.85 — a
missed tasking on a one-shot window is mission failure.

Your ENTIRE pipeline — tasking, next-access, acquisition, downlink, and
processing — must deliver a finished product in 360 MINUTES or less.

YOUR JOB
--------
  1. Analyze the provider catalog.
  2. Eliminate providers that fail any hard requirement.
  3. Pick the ONE provider that satisfies every constraint AND beats the clock.
  4. Submit the interception plan: provider id, sensor, total pipeline minutes.

Solve it and the system derives your flag.
================================================================================
"""


def show_brief():
    print(BRIEF)


def show_requirements():
    print("\n--- INTEL-DERIVED REQUIREMENTS ---")
    print(f"  Sensor must work at night/through cloud : {'YES (all-weather)' if REQ['needs_all_weather'] else 'no'}")
    print(f"  Max ground sample distance (GSD)        : <= {REQ['max_resolution_m']:.1f} m")
    print(f"  Minimum reliability score               : >= {REQ['min_reliability']:.2f}")
    print(f"  Min off-nadir (look) angle capability   : >= {REQ['min_off_nadir_deg']} deg")
    print(f"  Deadline for finished product           : <= {REQ['deadline_min']} min")
    print()


def show_catalog():
    print("\n--- SATELLITE PROVIDER CATALOG ---\n")
    for p in PROVIDERS:
        tot = total_pipeline(p)
        print(f"  [{p['id']}] {p['name']}")
        print(f"      Sensor/Mode    : {p['sensor']} / {p['mode']}")
        print(f"      Resolution GSD : {p['resolution_m']:.1f} m")
        print(f"      Reliability    : {p['reliability']:.2f}")
        print(f"      Max off-nadir  : {p['max_off_nadir_deg']} deg (look-angle slew)")
        print(f"      Coverage       : {p['day_night']} | swath {p['swath_km']} km")
        print(f"      Pipeline (min) : tasking {p['tasking']} + access {p['access']} "
              f"+ acq {p['acquisition']} + downlink {p['downlink']} + processing {p['processing']}")
        print(f"                       = TOTAL {tot} min")
        print(f"      Notes          : {p['notes']}")
        print()


# --------------------------------------------------------------------------
# Evaluation engine
# --------------------------------------------------------------------------
def evaluate(p):
    """Return (passes: bool, list of failure strings)."""
    fails = []
    if REQ["needs_all_weather"] and not p["cloud_penetration"]:
        fails.append("FAIL sensor: optical cannot see at night / through cloud")
    if p["resolution_m"] > REQ["max_resolution_m"]:
        fails.append(f"FAIL resolution: {p['resolution_m']:.1f} m > {REQ['max_resolution_m']:.1f} m")
    if p["reliability"] < REQ["min_reliability"]:
        fails.append(f"FAIL reliability: {p['reliability']:.2f} < {REQ['min_reliability']:.2f}")
    if p["max_off_nadir_deg"] < REQ["min_off_nadir_deg"]:
        fails.append(f"FAIL geometry: max off-nadir {p['max_off_nadir_deg']} deg "
                     f"< {REQ['min_off_nadir_deg']} deg needed to reach target")
    tot = total_pipeline(p)
    if tot > REQ["deadline_min"]:
        fails.append(f"FAIL deadline: {tot} min > {REQ['deadline_min']} min")
    return (len(fails) == 0, fails)


def run_analysis():
    print("\n--- AUTOMATED CONSTRAINT ANALYSIS ---\n")
    survivors = []
    for p in PROVIDERS:
        ok, fails = evaluate(p)
        verdict = "PASS  ** candidate **" if ok else "ELIMINATED"
        print(f"  [{p['id']}] {p['name']:<18} -> {verdict}")
        for f in fails:
            print(f"        - {f}")
        if ok:
            survivors.append(p)
    print()
    if len(survivors) == 1:
        s = survivors[0]
        print(f"  >> Exactly one provider survives every gate: [{s['id']}] {s['name']}")
    else:
        print(f"  >> {len(survivors)} providers survive — recheck the requirements.")
    print()


# --------------------------------------------------------------------------
# Plan submission
# --------------------------------------------------------------------------
def submit_plan():
    print("\n--- SUBMIT INTERCEPTION PLAN ---")
    print("Format your answer as three fields.\n")
    pid = input("  Provider id (e.g. SAT-0X) : ").strip().upper()
    sensor = input("  Sensor (OPTICAL/SAR)     : ").strip().upper()
    minutes = input("  Total pipeline minutes   : ").strip()

    canonical = f"{pid}|{sensor}|{minutes}"
    flag = derive_flag(canonical)
    print()
    if flag:
        print("  +----------------------------------------------------------+")
        print("  |  INTERCEPTION PLAN VALIDATED. Product will make the gate. |")
        print("  +----------------------------------------------------------+")
        print(f"\n  FLAG: {flag}\n")
    else:
        print("  XX  Plan rejected. The product will miss the window or the")
        print("      target. Re-run the analysis and reconsider sensor, GSD,")
        print("      reliability, and the full pipeline time.\n")


# --------------------------------------------------------------------------
# Menu loop
# --------------------------------------------------------------------------
MENU = """\
--------------------------------------------------------------------------------
  1) Re-read mission brief
  2) Show intel-derived requirements
  3) Show satellite provider catalog
  4) Run automated constraint analysis
  5) Submit interception plan
  6) Quit
--------------------------------------------------------------------------------
"""


def main():
    show_brief()
    while True:
        print(MENU)
        try:
            choice = input("  Select> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAborting tasking session.")
            return
        if choice == "1":
            show_brief()
        elif choice == "2":
            show_requirements()
        elif choice == "3":
            show_catalog()
        elif choice == "4":
            run_analysis()
        elif choice == "5":
            submit_plan()
        elif choice == "6":
            print("Session closed.")
            return
        else:
            print("  ? Unknown selection.\n")


if __name__ == "__main__":
    main()
