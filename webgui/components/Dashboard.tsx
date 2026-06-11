"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Starfield from "./Starfield";
import CompletionModal from "./CompletionModal";
import { MAX_ATTEMPTS, type ScenarioStatus } from "@/lib/constants";
import styles from "./dashboard.module.css";
import completionStyles from "./completion.module.css";

export type DashScenario = {
  id: string;
  codename: string;
  kind: "MISSILE_SITE" | "DARK_VESSEL";
  windowLabel: string;
  intel: string;
  attempts: number;
  status: ScenarioStatus;
};

const KIND_LABEL: Record<DashScenario["kind"], string> = {
  MISSILE_SITE: "MISSILE SITE",
  DARK_VESSEL: "DARK VESSEL",
};

export default function Dashboard({
  username,
  scenarios,
  practice = [],
}: {
  username: string;
  scenarios: DashScenario[];
  practice?: DashScenario[];
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const solved = scenarios.filter((s) => s.status === "solved").length;
  const skipped = scenarios.filter((s) => s.status === "skipped").length;

  // "Finished the game" = every assigned scenario is resolved (none still open).
  const allDone =
    scenarios.length > 0 && scenarios.every((s) => s.status !== "open");

  const [showCert, setShowCert] = useState(false);
  // Auto-prompt the certificate once per browser when the board is completed.
  useEffect(() => {
    if (!allDone) return;
    const key = `oi_cert_prompted_${username}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setShowCert(true);
    }
  }, [allDone, username]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <Starfield />
      <main className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.title}>
              ORBITAL<span className={styles.titleAccent}>INTERCEPT</span>
            </h1>
            <div className={styles.subtitle}>
              Mission board · Gulf Theatre (Training)
            </div>
          </div>
          <div className={styles.statusCluster}>
            <span className="tag">
              <span className="live-dot" /> &nbsp;OPERATOR: {username.toUpperCase()}
            </span>
            <span className="tag">
              {solved} SOLVED · {skipped} SKIPPED · {scenarios.length} ASSIGNED
            </span>
            <button className={styles.logout} onClick={logout} disabled={loggingOut}>
              {loggingOut ? "…" : "LOG OUT"}
            </button>
          </div>
        </header>

        <section className={`panel ${styles.briefBar}`}>
          <span className="tag">TASKING BOARD</span>
          <p className={styles.briefText}>
            You are assigned <b className={styles.hl}>{scenarios.length}</b>{" "}
            tasking problems. Each gives you{" "}
            <b className={styles.hl}>{MAX_ATTEMPTS} attempts</b> — solve it by
            transmitting the one provider plan that clears every gate, or{" "}
            <b className={styles.hl}>skip</b> it. After {MAX_ATTEMPTS} wrong
            submissions a scenario locks. Each solve yields your personal flag.
          </p>
        </section>

        {allDone && (
          <motion.section
            className={completionStyles.completeBanner}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={completionStyles.completeText}>
              ◆ <b>MISSION COMPLETE</b> — you cleared all {scenarios.length}{" "}
              assigned scenarios, solving <b>{solved}/{scenarios.length}</b>.
            </div>
            <button
              className={completionStyles.claimBtn}
              onClick={() => setShowCert(true)}
            >
              CLAIM YOUR CERTIFICATE ▾
            </button>
          </motion.section>
        )}

        <section className={styles.grid}>
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.id} s={s} index={i} />
          ))}
        </section>

        {practice.length > 0 && (
          <>
            <section className={`panel ${styles.briefBar} ${styles.practiceBar}`}>
              <span className="tag">PRACTICE RANGE · SAME FOR EVERYONE</span>
              <p className={styles.briefText}>
                Warm up here first. These{" "}
                <b className={styles.hl}>{practice.length} practice drills</b> are
                the same for every operator, have{" "}
                <b className={styles.hl}>unlimited attempts</b>, and are{" "}
                <b className={styles.hl}>not scored</b> — a separate set from your
                assigned scenarios, so nothing you do here affects your real flags.
              </p>
            </section>
            <section className={styles.grid}>
              {practice.map((s, i) => (
                <ScenarioCard key={s.id} s={s} index={i} practice />
              ))}
            </section>
          </>
        )}

        <footer className={styles.footer}>
          <span className="tag">
            ORBITAL INTERCEPT · CTF RANGE · fictional training scenarios
          </span>
        </footer>
      </main>

      <AnimatePresence>
        {showCert && (
          <CompletionModal
            operator={username}
            scenarios={scenarios}
            onClose={() => setShowCert(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ScenarioCard({
  s,
  index,
  practice = false,
}: {
  s: DashScenario;
  index: number;
  practice?: boolean;
}) {
  const left = MAX_ATTEMPTS - s.attempts;
  const locked = !practice && s.status === "locked";
  const solved = !practice && s.status === "solved";
  const skipped = !practice && s.status === "skipped";
  const playable = practice || (!locked && !solved && !skipped);

  const statusChip = practice
    ? { text: "PRACTICE ∞", cls: styles.chipPractice }
    : solved
      ? { text: "SOLVED ✓", cls: styles.chipSolved }
      : skipped
        ? { text: "SKIPPED", cls: styles.chipSkipped }
        : locked
          ? { text: "LOCKED", cls: styles.chipLocked }
          : { text: `${left}/${MAX_ATTEMPTS} ATTEMPTS`, cls: styles.chipOpen };

  return (
    <motion.div
      className={[
        "panel",
        styles.card,
        solved ? styles.cardSolved : "",
        locked ? styles.cardLocked : "",
        skipped ? styles.cardSkipped : "",
      ].join(" ")}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <div className={styles.cardTop}>
        <span
          className={s.kind === "MISSILE_SITE" ? styles.kindMissile : styles.kindVessel}
        >
          {KIND_LABEL[s.kind]}
        </span>
        <span className={`${styles.chip} ${statusChip.cls}`}>{statusChip.text}</span>
      </div>

      <div className={styles.cardId}>{s.id.toUpperCase()}</div>
      <div className={styles.cardName}>{s.codename}</div>
      <p className={styles.cardIntel}>{s.intel}</p>

      <div className={styles.cardFoot}>
        <span className={styles.window}>◣ {s.windowLabel}</span>
        {playable ? (
          <Link href={`/play/${s.id}`} className={styles.enter}>
            {practice ? "PRACTICE ▸" : "ENTER ▸"}
          </Link>
        ) : (
          <Link href={`/play/${s.id}`} className={styles.review}>
            REVIEW
          </Link>
        )}
      </div>
    </motion.div>
  );
}
