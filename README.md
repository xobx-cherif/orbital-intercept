# Orbital Intercept — Satellite Tasking CTF

A decision-under-constraints challenge. The player is an imagery tasking
officer who must task **one** satellite provider to image a target before a
hard deadline, choosing correctly between **SAR** and **optical** sensors and
weighing each provider's **reliability score** and **multi-stage processing
time**.

## Run
```bash
python3 orbital_intercept.py
```
No dependencies (standard library only).

## Player flow
1. Read the mission brief (intel + time constraints).
2. Inspect the provider catalog (sensor, resolution, reliability, pipeline).
3. Run the automated constraint analysis to eliminate providers.
4. Submit an **interception plan**: `provider id | sensor | total pipeline minutes`.
5. A correct plan derives the flag (the flag is stored only as ciphertext —
   the key is the correct plan itself, so there is no plaintext flag to grep).

## The five hard gates (intel-derived)
| Requirement | Why |
|---|---|
| All-weather sensor (SAR) | Target is at **night** under **thick monsoon cloud** → optical is blind |
| GSD ≤ 1.0 m | Must positively ID the **vessel class** from deck layout |
| Reliability ≥ 0.85 | One-shot window; a missed tasking = mission failure |
| Max off-nadir ≥ 35° | Target lies **off the ground track**; provider must slew to reach it |
| Total pipeline ≤ 360 min | Vessel leaves coverage in 6 hours |

`total pipeline = tasking + access + acquisition + downlink + processing`

---

## DESIGNER SOLUTION KEY (spoilers)

| Provider | Max off-nadir | Eliminated by |
|---|---|---|
| SAT-01 BlueEye-Optical | 30° | Optical → fails night/cloud (also off-nadir 30° < 35°) |
| SAT-02 OrbView-Optical | 45° | Optical → fails night/cloud |
| SAT-03 IronCloud-SAR | 20° | 3.0 m GSD > 1.0 m (also off-nadir 20° < 35°) |
| **SAT-04 NightHawk-SAR** | 45° | **survives every gate ✔** |
| SAT-05 PolarSAR | 40° | reliability 0.79 < 0.85 |
| SAT-06 RapidSAR | 40° | pipeline 430 min > 360 min |

**Correct plan:** `SAT-04 | SAR | 314`
(30 tasking + 180 access + 4 acquisition + 40 downlink + 60 processing = 314 min)

**Flag:** `CTF{n1ghthawk_SAR_spotlight_314min_intercept}`
