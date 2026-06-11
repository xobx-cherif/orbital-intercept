import { requireSession, ensureProgress } from "@/lib/session.server";
import { getScenario, PRACTICE_SCENARIOS } from "@/lib/scenarios";
import Dashboard, { type DashScenario } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function Page() {
  const state = ensureProgress(requireSession());

  const scenarios: DashScenario[] = Object.keys(state.p)
    .map((id) => {
      const sc = getScenario(id);
      if (!sc) return null;
      const prog = state.p[id];
      return {
        id: sc.id,
        codename: sc.codename,
        kind: sc.kind,
        windowLabel: sc.windowLabel,
        intel: sc.intel,
        attempts: prog.attempts,
        status: prog.status,
      };
    })
    .filter((x): x is DashScenario => x !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  // Practice set — same for everyone, no per-user progress.
  const practice: DashScenario[] = PRACTICE_SCENARIOS.map((sc) => ({
    id: sc.id,
    codename: sc.codename,
    kind: sc.kind,
    windowLabel: sc.windowLabel,
    intel: sc.intel,
    attempts: 0,
    status: "open" as const,
  }));

  return <Dashboard username={state.u} scenarios={scenarios} practice={practice} />;
}
