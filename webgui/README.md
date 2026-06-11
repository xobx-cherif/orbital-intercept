# Orbital Intercept — Multi-Scenario Tasking Range

A cyber-intel / space-themed **Next.js** CTF range. Operators log in, get a board
of assigned satellite-tasking problems, and recover a **personal flag** for each
one they solve.

> **Fictional training content.** All scenarios (a notional Iran–UAE conflict —
> missile-site / TEL imaging and dark-vessel weapons-smuggling hunts), call-signs,
> and numbers are invented for the exercise. No real targeting data.

## What it does
- **Login** for **26 operators** (`operator01`…`operator26`), username + password.
- **12 scored scenarios** in the pool; each operator is deterministically assigned **4**.
- Each scenario: pick the ONE satellite provider whose sensor, GSD, reliability,
  off-nadir slew, and full pipeline time clear every mission gate.
- **2 attempts per scored scenario**, then it locks. Operators may **skip** one.
- **Unique flag per operator per scored scenario** — flags can't be shared between students.
- **Practice range** — **3 training drills, the same for everyone**, with
  **unlimited attempts**, **not scored**, and a **separate set** from the 12 scored
  scenarios. Their correct answers are deliberately providers that are *never* a
  correct answer in the scored set, so practising can't leak a real flag. Practice
  solves yield a shared `CTF{practice_pNN_...}` token (identical for all operators).
- **HELP overlay** with animated explanations of each tasking parameter.

## Architecture
- **Scenarios** (`lib/scenarios.ts`) — client-safe data + the gate engine
  (`evaluate`, `totalPipeline`). Each scenario has exactly one provider that clears
  all gates; the *correct plan* is recomputed by `evaluate`, never written down.
- **Flags** (`lib/flag.ts`, `server-only`) — `CTF{<kind>_<id>_<token>}` where
  `token = HMAC_SHA256(FLAG_SECRET, "username|scenarioId|correctPlan")`. Per-user,
  per-scenario, derived server-side, only returned on a correct submission.
- **Users** (`lib/users.server.ts` + `lib/users.data.json`, `server-only`) — scrypt
  password hashes + each user's 4 scenario ids. **No plaintext passwords in the repo.**
- **Session/progress** (`lib/session.server.ts`, `server-only`) — one HMAC-signed
  cookie (`oi_session`) holding the username + per-scenario attempts/status. No DB.
- **Routes** — `/login`, `/` (dashboard), `/play/[id]` (the console), and API routes
  `auth/login`, `auth/logout`, `intercept`, `scenario/skip`.

## Run locally
```bash
cd webgui
npm install
cp .env.local .env.local            # already present; edit the two secrets
npm run gen:roster                  # writes lib/users.data.json + ROSTER.md
npm run dev                         # http://localhost:1234
```
`ROSTER.md` (git-ignored) is your instructor handout: each operator's plaintext
password, assigned scenarios, and expected flags.

Production build (also runs the scenario-integrity check):
```bash
npm run build && npm run start
```

## Environment variables
| Var | Purpose |
|---|---|
| `SESSION_SECRET` | signs the session cookie (HMAC). |
| `FLAG_SECRET` | keys the per-user flag HMAC. **Flags depend on this value.** |

Generate strong values: `openssl rand -hex 32`. There are dev fallbacks so
`npm run dev` works without setup, but **production must set both**.

> ⚠️ **Flags depend on `FLAG_SECRET`.** Set `FLAG_SECRET` first, then run
> `npm run gen:roster` **with that same secret in your env** so `ROSTER.md` matches
> what the deployed site will accept. If you change `FLAG_SECRET` later, regenerate
> the roster (old flags stop matching).

## Deploy to Netlify (free)
1. Push this repo to GitHub (the `webgui/` folder is what Netlify builds — see
   `netlify.toml`, which sets `base = "webgui"`).
2. In Netlify: **Add new site → Import from Git →** pick the repo.
   - Base directory: `webgui` · Build command: `npm run build` · Publish: `.next`
     (the `@netlify/plugin-nextjs` plugin handles the Next.js server/runtime).
3. **Site configuration → Environment variables**, add:
   - `SESSION_SECRET` = (your `openssl rand -hex 32`)
   - `FLAG_SECRET` = (your `openssl rand -hex 32`)
4. Locally run `FLAG_SECRET=<same value> npm run gen:roster`, commit the regenerated
   `lib/users.data.json` (hashes only — safe), and keep `ROSTER.md` private.
5. Trigger a deploy. Hand each student their `operatorNN` + password from `ROSTER.md`.

## Security notes / threat model
- No plaintext passwords, no flags, and no secrets ship to the browser — verified by
  grepping the built `.next/static` bundle (zero hits for hashes/passwords/`CTF{`).
- The session cookie is HMAC-signed: editing attempts/status invalidates it.
- **Honor-system caveat:** progress lives in the user's own cookie, so a student can
  *reset their own attempts* by clearing cookies. This was an intentional trade-off
  (no database). To hard-lock attempts server-side, move `SessionState.p` into a KV
  store (Upstash Redis or Netlify Blobs) keyed by username — the API routes already
  centralise all reads/writes, so it's a contained change.

## Scripts
- `npm run check:scenarios` — asserts every scenario has exactly one valid provider
  (also runs automatically before `build`).
- `npm run gen:roster` — (re)generate the 26 users + `ROSTER.md`.
