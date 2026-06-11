import { redirect, notFound } from "next/navigation";
import Console from "@/components/Console";
import { getScenario } from "@/lib/scenarios";
import { requireSession, ensureProgress, MAX_ATTEMPTS } from "@/lib/session.server";
import { isTestAccount } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function PlayPage({ params }: { params: { id: string } }) {
  const state = ensureProgress(requireSession());
  const scenario = getScenario(params.id);
  if (!scenario) notFound();

  // The "Run constraint analysis" helper reveals which provider passes every
  // gate, so on SCORED scenarios it would be cheating. Allow it only for
  // practice drills and recognised test/instructor accounts.
  const allowAnalysis = scenario.practice === true || isTestAccount(state.u);

  // Practice drills are open to every signed-in operator: unlimited attempts,
  // no scoring, no cookie progress.
  if (scenario.practice) {
    return (
      <Console
        scenario={scenario}
        attempts={0}
        status="open"
        maxAttempts={Infinity}
        allowAnalysis={allowAnalysis}
      />
    );
  }

  const prog = state.p[params.id];
  // Scored scenario not in the user's assigned set → back to the board.
  if (!prog) redirect("/");

  return (
    <Console
      scenario={scenario}
      attempts={prog.attempts}
      status={prog.status}
      maxAttempts={MAX_ATTEMPTS}
      allowAnalysis={allowAnalysis}
    />
  );
}
