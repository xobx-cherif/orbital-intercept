import { NextRequest, NextResponse } from "next/server";
import { findUser, verifyPassword } from "@/lib/users.server";
import { freshSession, setSessionCookie } from "@/lib/session.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Username and password required." }, { status: 400 });
  }

  const user = findUser(username);
  // Always run a verify to keep timing uniform-ish even when user is missing.
  const ok = user ? verifyPassword(user, password) : false;
  if (!user || !ok) {
    return NextResponse.json(
      { ok: false, error: "ACCESS DENIED — invalid credentials." },
      { status: 401 },
    );
  }

  setSessionCookie(freshSession(user.username));
  return NextResponse.json({ ok: true });
}
