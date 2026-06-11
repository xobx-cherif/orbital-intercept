import { NextRequest, NextResponse } from "next/server";
import { getSession, setSessionCookie, ensureProgress } from "@/lib/session.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: { scenarioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const scenarioId = String(body.scenarioId ?? "").trim();
  const state = ensureProgress(session);
  const prog = state.p[scenarioId];
  if (!prog) {
    return NextResponse.json({ ok: false, error: "Scenario not assigned to you." }, { status: 403 });
  }

  if (prog.status === "solved") {
    return NextResponse.json({ ok: false, error: "Already solved." }, { status: 409 });
  }

  prog.status = "skipped";
  setSessionCookie(state);
  return NextResponse.json({ ok: true, status: prog.status });
}
