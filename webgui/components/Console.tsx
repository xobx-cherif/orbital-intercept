"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Starfield from "./Starfield";
import HelpOverlay from "./HelpOverlay";
import helpStyles from "./help.module.css";
import {
  type Provider,
  type Scenario,
  PIPELINE_STAGES,
  totalPipeline,
  evaluate,
} from "@/lib/scenarios";
import { type ScenarioStatus } from "@/lib/constants";
import styles from "./console.module.css";

const STAGE_LABELS: Record<string, string> = {
  tasking: "TASK",
  access: "ACCESS",
  acquisition: "ACQ",
  downlink: "DOWNLINK",
  processing: "PROC",
};

export default function Console({
  scenario,
  attempts,
  status,
  maxAttempts,
  allowAnalysis = false,
}: {
  scenario: Scenario;
  attempts: number;
  status: ScenarioStatus;
  maxAttempts: number;
  allowAnalysis?: boolean;
}) {
  const router = useRouter();
  const req = scenario.req;
  const providers = scenario.providers;

  const [analyzed, setAnalyzed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Gate analysis is only meaningful when permitted (practice / test account);
  // for everyone else it stays off no matter what.
  const effAnalyzed = analyzed && allowAnalysis;

  const [provider, setProvider] = useState("");
  const [sensor, setSensor] = useState("");
  const [minutes, setMinutes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  // Live, client-tracked progress (initialised from server props).
  const [attemptsUsed, setAttemptsUsed] = useState(attempts);
  const [liveStatus, setLiveStatus] = useState<ScenarioStatus>(status);
  const [flag, setFlag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPractice = !!scenario.practice;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
  const solved = liveStatus === "solved";
  const skipped = liveStatus === "skipped";
  const locked = !isPractice && (liveStatus === "locked" || (attemptsLeft <= 0 && !solved));
  // Practice never locks and stays replayable even after a correct solve.
  const formDisabled = isPractice ? submitting : solved || skipped || locked || submitting;

  const survivorCount = useMemo(
    () => providers.filter((p) => evaluate(p, req).ok).length,
    [providers, req],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (formDisabled) return;
    setSubmitting(true);
    setError(null);
    setFlag(null);
    try {
      const res = await fetch("/api/intercept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, provider, sensor, minutes }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlag(data.flag);
        if (!isPractice) {
          setLiveStatus("solved");
          setAttemptsUsed((n) => Math.min(maxAttempts, n + 1));
        }
      } else {
        setError(data.error ?? "Plan rejected.");
        if (!isPractice) {
          if (typeof data.attemptsLeft === "number") {
            setAttemptsUsed(maxAttempts - data.attemptsLeft);
          } else {
            setAttemptsUsed((n) => Math.min(maxAttempts, n + 1));
          }
          if (data.status) setLiveStatus(data.status as ScenarioStatus);
        }
      }
      if (!isPractice) router.refresh();
    } catch {
      setError("Uplink failure. Retry transmission.");
    } finally {
      setSubmitting(false);
    }
  }

  async function skip() {
    if (solved || skipped) return;
    const ok = window.confirm(
      `Skip "${scenario.codename}"? You won't be able to earn its flag.`,
    );
    if (!ok) return;
    await fetch("/api/scenario/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: scenario.id }),
    });
    setLiveStatus("skipped");
    router.refresh();
  }

  function useProvider(p: Provider) {
    if (formDisabled) return;
    setProvider(p.id);
    setSensor(p.sensor);
    setMinutes(String(totalPipeline(p)));
    setSelected(p.id);
    document
      .getElementById("plan-uplink")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const isMissile = scenario.kind === "MISSILE_SITE";

  return (
    <>
      <Starfield />
      <AnimatePresence>
        {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>
      <main className={styles.shell}>
        {/* ===== top bar ===== */}
        <header className={styles.topbar}>
          <div className={styles.brandRow}>
            <RadarBadge />
            <div>
              <h1 className={styles.title}>
                ORBITAL<span className={styles.titleAccent}>INTERCEPT</span>
              </h1>
              <div className={styles.subtitle}>
                {scenario.id.toUpperCase()} · {scenario.codename} ·{" "}
                {isMissile ? "MISSILE SITE" : "DARK VESSEL"}
              </div>
            </div>
          </div>
          <div className={styles.statusCluster}>
            <div className={styles.headBtns}>
              <Link href="/" className={styles.backBtn}>
                ◂ BOARD
              </Link>
              <button
                className={helpStyles.helpTrigger}
                onClick={() => setHelpOpen(true)}
              >
                ? HELP
              </button>
            </div>
            <span className={`tag ${isPractice ? styles.tagOpen : statusTagClass(liveStatus, attemptsLeft, styles)}`}>
              {isPractice ? "PRACTICE · UNLIMITED TRIES" : statusText(liveStatus, attemptsLeft, maxAttempts)}
            </span>
            <span className="tag">{isPractice ? "TRAINING · NOT SCORED" : "CLASS // EYES ONLY"}</span>
          </div>
        </header>

        {/* ===== mission brief ===== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`panel ${styles.brief}`}
        >
          <div className={styles.briefHead}>
            <span className="tag">INTEL SUMMARY · {scenario.codename}</span>
            <span className={`tag ${styles.flashAmber}`}>
              ◣ WINDOW CLOSING · {scenario.windowLabel}
            </span>
          </div>
          <p className={styles.briefBody}>{scenario.intel}</p>
          <div className={styles.factGrid}>
            {scenario.facts.map((f, i) => (
              <div key={i} className={styles.fact}>
                <span className={styles.factIcon}>{f.icon}</span>
                <div>
                  <div className={styles.factTitle}>{f.title}</div>
                  <div className={styles.factText}>{f.text}</div>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.briefMission}>
            <b>YOUR JOB:</b> {scenario.mission}
          </p>
        </motion.section>

        {/* ===== requirements ===== */}
        <section className={styles.reqRow}>
          <ReqCard
            label="SENSOR"
            value={req.needs_all_weather ? "ALL-WEATHER" : "ANY (CLEAR)"}
            sub={req.needs_all_weather ? "night + cloud penetration" : "optical permitted"}
          />
          <ReqCard
            label="MAX GSD"
            value={`≤ ${req.max_resolution_m.toFixed(1)} m`}
            sub="resolve the target"
          />
          <ReqCard
            label="RELIABILITY"
            value={`≥ ${req.min_reliability.toFixed(2)}`}
            sub="one-shot window"
          />
          <ReqCard
            label="OFF-NADIR"
            value={`≥ ${req.min_off_nadir_deg}°`}
            sub="slew to off-track target"
          />
          <ReqCard
            label="DEADLINE"
            value={`≤ ${req.deadline_min} min`}
            sub="full pipeline"
          />
        </section>

        {/* ===== catalog ===== */}
        <section className={styles.catalogHead}>
          <h2 className={styles.h2}>SATELLITE PROVIDER CATALOG</h2>
          {allowAnalysis ? (
            <button
              className={styles.analyzeBtn}
              onClick={() => setAnalyzed((v) => !v)}
            >
              {effAnalyzed ? "◼ HIDE GATE ANALYSIS" : "▶ RUN CONSTRAINT ANALYSIS"}
            </button>
          ) : (
            <span className={`tag ${styles.analyzeLocked}`}>
              MANUAL TASKING · evaluate the gates yourself
            </span>
          )}
        </section>

        <AnimatePresence>
          {effAnalyzed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={styles.analysisNote}
            >
              {survivorCount === 1 ? (
                <span>
                  ANALYSIS COMPLETE · exactly{" "}
                  <b className={styles.hlGreen}>1 provider</b> survives every
                  gate. Identify it and transmit its plan.
                </span>
              ) : (
                <span>
                  {survivorCount} providers survive — recheck the requirements.
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <section className={styles.grid}>
          {providers.map((p, i) => (
            <ProviderCard
              key={p.id}
              p={p}
              index={i}
              req={req}
              analyzed={effAnalyzed}
              selected={selected === p.id}
              disabled={formDisabled}
              onTask={() => useProvider(p)}
            />
          ))}
        </section>

        {/* ===== plan uplink ===== */}
        <section id="plan-uplink" className={`panel ${styles.uplink}`}>
          <div className={styles.uplinkHead}>
            <span className="tag">▲ TRANSMIT INTERCEPTION PLAN</span>
            <span className="tag">
              {isPractice
                ? "PRACTICE · UNLIMITED"
                : solved
                  ? "SCENARIO SOLVED"
                  : skipped
                    ? "SCENARIO SKIPPED"
                    : locked
                      ? "SCENARIO LOCKED"
                      : `ATTEMPTS LEFT ${attemptsLeft}/${maxAttempts}`}
            </span>
          </div>

          <form className={styles.form} onSubmit={submit}>
            <Field
              label="PROVIDER ID"
              placeholder="SAT-0X"
              value={provider}
              onChange={setProvider}
              disabled={formDisabled}
            />
            <Field
              label="SENSOR"
              placeholder="SAR / OPTICAL"
              value={sensor}
              onChange={setSensor}
              disabled={formDisabled}
            />
            <Field
              label="TOTAL PIPELINE (MIN)"
              placeholder="000"
              value={minutes}
              onChange={setMinutes}
              disabled={formDisabled}
            />
            <button
              className={styles.transmit}
              type="submit"
              disabled={formDisabled}
            >
              {submitting ? "TRANSMITTING…" : "TASK INTERCEPT ▸"}
            </button>
          </form>

          {!isPractice && !solved && !skipped && (
            <button className={styles.skipBtn} onClick={skip} disabled={submitting}>
              SKIP THIS SCENARIO
            </button>
          )}

          <AnimatePresence mode="wait">
            {flag && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={styles.flagOk}
              >
                <div className={styles.flagBanner}>
                  {isPractice
                    ? "◆ PRACTICE PLAN VALIDATED · WELL FLOWN"
                    : "◆ INTERCEPTION PLAN VALIDATED · PRODUCT MAKES THE GATE"}
                </div>
                <div className={styles.flagLabel}>
                  {isPractice ? "PRACTICE FLAG (SHARED)" : "YOUR FLAG (UNIQUE TO YOU)"}
                </div>
                <code className={styles.flagValue}>{flag}</code>
                {isPractice && (
                  <div className={styles.errText} style={{ marginTop: 10 }}>
                    Nice — that&rsquo;s the drill. You can keep experimenting; practice
                    is unlimited and never scored. Head back to the board for your real
                    assigned scenarios.
                  </div>
                )}
              </motion.div>
            )}
            {!flag && error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={styles.flagErr}
              >
                <div className={styles.errBanner}>
                  {locked ? "✕ SCENARIO LOCKED" : "✕ PLAN REJECTED"}
                </div>
                <div className={styles.errText}>{error}</div>
              </motion.div>
            )}
            {!flag && !error && (solved || skipped || locked) && (
              <motion.div
                key="state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={solved ? styles.flagOk : styles.flagErr}
              >
                <div className={solved ? styles.flagBanner : styles.errBanner}>
                  {solved
                    ? "◆ ALREADY SOLVED"
                    : skipped
                      ? "▣ SCENARIO SKIPPED"
                      : "✕ NO ATTEMPTS REMAINING"}
                </div>
                <div className={styles.errText}>
                  {solved
                    ? "You already recovered this flag. Check the roster or your earlier transmission."
                    : skipped
                      ? "You skipped this scenario. It can no longer be solved."
                      : "Both attempts are used. This scenario is locked."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <footer className={styles.footer}>
          <Link href="/" className={styles.backBtnWide}>
            ◂ BACK TO MISSION BOARD
          </Link>
        </footer>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* status helpers                                                      */
/* ------------------------------------------------------------------ */
function statusText(status: ScenarioStatus, left: number, max: number): string {
  if (status === "solved") return "SOLVED ✓";
  if (status === "skipped") return "SKIPPED";
  if (status === "locked" || left <= 0) return "LOCKED";
  return `${left}/${max} ATTEMPTS LEFT`;
}
function statusTagClass(
  status: ScenarioStatus,
  left: number,
  s: Record<string, string>,
): string {
  if (status === "solved") return s.tagSolved;
  if (status === "skipped") return s.tagSkipped;
  if (status === "locked" || left <= 0) return s.tagLocked;
  return s.tagOpen;
}

/* ------------------------------------------------------------------ */
/* sub-components                                                      */
/* ------------------------------------------------------------------ */

function RadarBadge() {
  return (
    <div className={styles.radar}>
      <div className={styles.radarRing} />
      <div className={styles.radarRing2} />
      <div className={styles.radarSweep} />
      <div className={styles.radarDot} />
    </div>
  );
}

function ReqCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`panel ${styles.reqCard}`}>
      <span className="tag">{label}</span>
      <div className={styles.reqValue}>{value}</div>
      <div className={styles.reqSub}>{sub}</div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    </label>
  );
}

function ProviderCard({
  p,
  index,
  req,
  analyzed,
  selected,
  disabled,
  onTask,
}: {
  p: Provider;
  index: number;
  req: Scenario["req"];
  analyzed: boolean;
  selected: boolean;
  disabled: boolean;
  onTask: () => void;
}) {
  const total = totalPipeline(p);
  const verdict = evaluate(p, req);
  const isSar = p.sensor === "SAR";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={[
        "panel",
        styles.card,
        analyzed ? (verdict.ok ? styles.cardPass : styles.cardFail) : "",
        selected ? styles.cardSelected : "",
      ].join(" ")}
    >
      <div className={styles.cardTop}>
        <div>
          <div className={styles.cardId}>{p.id}</div>
          <div className={styles.cardName}>{p.name}</div>
        </div>
        <span
          className={isSar ? styles.badgeSar : styles.badgeOpt}
          title={p.mode}
        >
          {p.sensor}
        </span>
      </div>

      <div className={styles.specGrid}>
        <Spec label="MODE" value={p.mode} />
        <Spec
          label="GSD"
          value={`${p.resolution_m.toFixed(1)} m`}
          bad={analyzed && p.resolution_m > req.max_resolution_m}
        />
        <Spec
          label="RELIABILITY"
          value={p.reliability.toFixed(2)}
          bad={analyzed && p.reliability < req.min_reliability}
        />
        <Spec
          label="COVERAGE"
          value={p.day_night === "ALL-WEATHER" ? "ALL-WX" : "DAY"}
          bad={analyzed && req.needs_all_weather && !p.cloud_penetration}
        />
        <Spec
          label="OFF-NADIR"
          value={`${p.max_off_nadir_deg}°`}
          bad={analyzed && p.max_off_nadir_deg < req.min_off_nadir_deg}
        />
      </div>

      {/* reliability bar */}
      <div className={styles.relWrap}>
        <div className={styles.relTrack}>
          <div
            className={styles.relFill}
            style={{
              width: `${Math.min(p.reliability, 1) * 100}%`,
              background:
                p.reliability >= req.min_reliability
                  ? "var(--green)"
                  : "var(--red)",
            }}
          />
          <div
            className={styles.relThresh}
            style={{ left: `${req.min_reliability * 100}%` }}
            title={`min ${req.min_reliability}`}
          />
        </div>
      </div>

      {/* pipeline stages */}
      <div className={styles.pipe}>
        {PIPELINE_STAGES.map((s) => {
          const max = 250; // longest single stage in catalog, for bar scale
          const pct = Math.max(8, (p[s] / max) * 100);
          return (
            <div key={s} className={styles.pipeStage} title={`${s}: ${p[s]} min`}>
              <div className={styles.pipeLabel}>{STAGE_LABELS[s]}</div>
              <div className={styles.pipeBarTrack}>
                <div className={styles.pipeBar} style={{ height: `${pct}%` }} />
              </div>
              <div className={styles.pipeVal}>{p[s]}</div>
            </div>
          );
        })}
        <div className={styles.pipeTotal}>
          <div className={styles.pipeLabel}>TOTAL</div>
          <div
            className={[
              styles.pipeTotalVal,
              analyzed && total > req.deadline_min ? styles.bad : "",
            ].join(" ")}
          >
            {total}
            <span className={styles.pipeUnit}>min</span>
          </div>
        </div>
      </div>

      <div className={styles.notes}>{p.notes}</div>

      {analyzed && (
        <div className={styles.verdict}>
          {verdict.ok ? (
            <span className={styles.verdictPass}>
              ✓ PASS · CLEARED FOR TASKING
            </span>
          ) : (
            <ul className={styles.failList}>
              {verdict.fails.map((f, i) => (
                <li key={i}>✕ {f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button className={styles.useBtn} onClick={onTask} disabled={disabled}>
        LOAD INTO PLAN ▸
      </button>
    </motion.div>
  );
}

function Spec({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className={styles.spec}>
      <span className={styles.specLabel}>{label}</span>
      <span className={[styles.specVal, bad ? styles.bad : ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}
