import { NextRequest, NextResponse } from "next/server";
import { getScenario } from "@/lib/scenarios";
import { canonicalizeSubmission, checkAndFlag } from "@/lib/flag";
import {
  getSession,
  setSessionCookie,
  ensureProgress,
  MAX_ATTEMPTS,
} from "@/lib/session.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: {
    scenarioId?: string;
    provider?: string;
    sensor?: string;
    minutes?: string | number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed transmission." }, { status: 400 });
  }

  const scenarioId = String(body.scenarioId ?? "").trim();
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return NextResponse.json({ ok: false, error: "Unknown scenario." }, { status: 404 });
  }

  const provider0 = String(body.provider ?? "").trim();
  const sensor0 = String(body.sensor ?? "").trim();
  const minutes0 = String(body.minutes ?? "").trim();

  // ---- PRACTICE: unlimited attempts, no scoring, no cookie progress --------
  // Any signed-in operator can attempt any practice drill as many times as they
  // like. Practice flags are shared (same for everyone), not per-user.
  if (scenario.practice) {
    if (!provider0 || !sensor0 || !minutes0) {
      return NextResponse.json({ ok: false, error: "All three plan fields are required." }, { status: 400 });
    }
    const flag = checkAndFlag(session.u, scenario, canonicalizeSubmission(provider0, sensor0, minutes0));
    if (flag) {
      return NextResponse.json({ ok: true, flag, status: "solved", practice: true });
    }
    return NextResponse.json({
      ok: false,
      practice: true,
      error: "PLAN REJECTED — re-check the gates and try again. (Practice: unlimited attempts.)",
    });
  }

  const state = ensureProgress(session);
  const prog = state.p[scenarioId];
  if (!prog) {
    return NextResponse.json({ ok: false, error: "Scenario not assigned to you." }, { status: 403 });
  }

  // Already resolved?
  if (prog.status === "solved") {
    return NextResponse.json({ ok: false, error: "Scenario already solved.", status: "solved" }, { status: 409 });
  }
  if (prog.status === "skipped") {
    return NextResponse.json({ ok: false, error: "Scenario was skipped.", status: "skipped" }, { status: 409 });
  }
  if (prog.attempts >= MAX_ATTEMPTS || prog.status === "locked") {
    return NextResponse.json(
      { ok: false, error: "No attempts remaining — scenario locked.", status: "locked", attemptsLeft: 0 },
      { status: 423 },
    );
  }

  if (!provider0 || !sensor0 || !minutes0) {
    return NextResponse.json(
      { ok: false, error: "All three plan fields are required.", attemptsLeft: MAX_ATTEMPTS - prog.attempts },
      { status: 400 },
    );
  }

  // Count this attempt.
  prog.attempts += 1;

  const submission = canonicalizeSubmission(provider0, sensor0, minutes0);
  const flag = checkAndFlag(session.u, scenario, submission);

  if (flag) {
    prog.status = "solved";
    setSessionCookie(state);
    return NextResponse.json({ ok: true, flag, status: "solved" });
  }

  const attemptsLeft = MAX_ATTEMPTS - prog.attempts;
  if (attemptsLeft <= 0) prog.status = "locked";
  setSessionCookie(state);

  return NextResponse.json({
    ok: false,
    status: prog.status,
    attemptsLeft,
    error:
      attemptsLeft > 0
        ? `PLAN REJECTED — product will miss the window or the target. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : "PLAN REJECTED — no attempts remaining. Scenario locked.",
  });
}
