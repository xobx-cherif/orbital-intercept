"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./help.module.css";

/* Palette — mirrors globals.css. SVG presentation attributes (fill=/stroke=)
   do NOT resolve CSS custom properties, so we use literal hex here. */
const C = {
  cyan: "#58e7ff",
  amber: "#ffb547",
  green: "#57f2a4",
  red: "#ff5d6c",
  violet: "#9b8cff",
  ice: "#cdeffb",
  txtDim: "#6f8aa0",
  txtFaint: "#44586b",
};
const MONO = '"JetBrains Mono", monospace';

type Topic = {
  key: string;
  label: string;
  req: string;
  title: string;
  what: React.ReactNode;
  impact: React.ReactNode;
  anim: React.ReactNode;
};

/* ============================================================= */
/*  Animated illustrations — one per tasking parameter            */
/* ============================================================= */

/* OFF-NADIR — animated satellite slewing its look-angle to reach
   an off-track target. This is the headline "ndir" explainer. */
function OffNadirAnim() {
  const sat = { x: 200, y: 40 };
  const nadir = { x: 200, y: 195 }; // straight down (ground track)
  const target = { x: 320, y: 195 }; // off to the side, off-track
  return (
    <svg viewBox="0 0 400 230" width="100%" height="100%">
      {/* ground line */}
      <line x1="20" y1="195" x2="380" y2="195" stroke="rgba(88,231,255,0.25)" strokeWidth="1" />
      {/* ground track marker (nadir point) */}
      <circle cx={nadir.x} cy={nadir.y} r="3" fill={C.txtFaint} />
      <text x={nadir.x} y="213" fill={C.txtFaint} fontSize="9" fontFamily={MONO} textAnchor="middle">
        GROUND TRACK
      </text>

      {/* nadir reference (dotted straight-down) */}
      <line x1={sat.x} y1={sat.y} x2={nadir.x} y2={nadir.y} stroke="rgba(120,140,160,0.4)" strokeWidth="1" strokeDasharray="3 4" />

      {/* slewing look-beam: pivots from nadir toward the off-track target */}
      <motion.line
        x1={sat.x}
        y1={sat.y}
        x2={nadir.x}
        y2={nadir.y}
        stroke={C.cyan}
        strokeWidth="2"
        animate={{ x2: [nadir.x, target.x, nadir.x] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: `drop-shadow(0 0 5px ${C.cyan})` }}
      />
      {/* angle arc near satellite */}
      <motion.path
        d={`M ${sat.x} ${sat.y + 34} A 34 34 0 0 1 ${sat.x + 21} ${sat.y + 27}`}
        stroke={C.amber}
        strokeWidth="1.5"
        fill="none"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.text
        x={sat.x + 30}
        y={sat.y + 54}
        fill={C.amber}
        fontSize="11"
        fontFamily={MONO}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        off-nadir°
      </motion.text>

      {/* satellite body */}
      <g>
        <rect x={sat.x - 9} y={sat.y - 7} width="18" height="14" rx="2" fill={C.ice} />
        <rect x={sat.x - 22} y={sat.y - 4} width="11" height="8" fill={C.violet} />
        <rect x={sat.x + 11} y={sat.y - 4} width="11" height="8" fill={C.violet} />
      </g>

      {/* off-track target (the vessel) */}
      <motion.g
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx={target.x} cy={target.y} r="7" fill="none" stroke={C.green} strokeWidth="1.5" />
        <circle cx={target.x} cy={target.y} r="2.5" fill={C.green} />
        <text x={target.x} y="213" fill={C.green} fontSize="9" fontFamily={MONO} textAnchor="middle">
          TARGET
        </text>
      </motion.g>
    </svg>
  );
}

/* SENSOR — optical blinded by night+cloud while SAR pulse penetrates */
function SensorAnim() {
  return (
    <svg viewBox="0 0 400 230" width="100%" height="100%">
      {/* night sky tint */}
      <rect x="0" y="0" width="400" height="230" fill="rgba(20,30,60,0.25)" />
      {/* moon */}
      <circle cx="50" cy="40" r="13" fill="rgba(205,239,251,0.6)" />
      <circle cx="55" cy="36" r="13" fill="rgba(20,30,60,0.45)" />

      {/* ground / sea */}
      <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(88,231,255,0.25)" strokeWidth="1" />
      <circle cx="200" cy="200" r="3" fill={C.green} />

      {/* cloud band */}
      <motion.g
        animate={{ x: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="200" cy="120" rx="120" ry="22" fill="rgba(120,140,170,0.30)" />
        <ellipse cx="150" cy="115" rx="55" ry="20" fill="rgba(120,140,170,0.28)" />
        <ellipse cx="255" cy="125" rx="60" ry="20" fill="rgba(120,140,170,0.28)" />
        <text x="200" y="124" fill="rgba(205,225,240,0.75)" fontSize="9" fontFamily={MONO} textAnchor="middle">
          THICK CLOUD
        </text>
      </motion.g>

      {/* OPTICAL satellite (left) — beam stops at cloud */}
      <g>
        <rect x="101" y="33" width="16" height="12" rx="2" fill={C.amber} />
        <text x="109" y="28" fill={C.amber} fontSize="9" fontFamily={MONO} textAnchor="middle">OPTICAL</text>
      </g>
      <motion.line
        x1="109" y1="45" x2="135" y2="100"
        stroke={C.amber} strokeWidth="2"
        animate={{ opacity: [0.9, 0.2, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <motion.text
        x="120" y="155" fill={C.red} fontSize="10" fontFamily={MONO} textAnchor="middle"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        ✕ BLOCKED
      </motion.text>

      {/* SAR satellite (right) — pulse passes through to target and back */}
      <g>
        <rect x="283" y="33" width="16" height="12" rx="2" fill={C.violet} />
        <text x="291" y="28" fill={C.violet} fontSize="9" fontFamily={MONO} textAnchor="middle">SAR</text>
      </g>
      <line x1="291" y1="45" x2="200" y2="200" stroke="rgba(155,140,255,0.35)" strokeWidth="1" strokeDasharray="2 4" />
      <motion.circle
        r="4" fill={C.violet}
        animate={{ cx: [291, 200], cy: [45, 200], opacity: [1, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        style={{ filter: `drop-shadow(0 0 5px ${C.violet})` }}
      />
      <motion.text
        x="300" y="155" fill={C.green} fontSize="10" fontFamily={MONO} textAnchor="middle"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        ✓ THROUGH
      </motion.text>
    </svg>
  );
}

/* MAX GSD — coarse pixels vs a sharply resolved vessel */
function GsdAnim() {
  return (
    <svg viewBox="0 0 400 230" width="100%" height="100%">
      <text x="120" y="24" fill={C.red} fontSize="10" fontFamily={MONO} textAnchor="middle">3.0 m GSD</text>
      <text x="290" y="24" fill={C.green} fontSize="10" fontFamily={MONO} textAnchor="middle">0.8 m GSD</text>

      {/* coarse blob — left */}
      <g transform="translate(70,40)">
        {Array.from({ length: 16 }).map((_, i) => {
          const c = i % 4;
          const r = Math.floor(i / 4);
          const lit = [5, 6, 9, 10].includes(i);
          return (
            <rect
              key={i}
              x={c * 25}
              y={r * 25}
              width="24"
              height="24"
              fill={lit ? "rgba(88,231,255,0.45)" : "rgba(88,231,255,0.08)"}
              stroke="rgba(0,0,0,0.3)"
            />
          );
        })}
        <text x="50" y="125" fill={C.red} fontSize="10" fontFamily={MONO} textAnchor="middle">
          ? unknown class
        </text>
      </g>

      {/* fine resolved vessel — right, fades in/out */}
      <motion.g
        transform="translate(230,40)"
        animate={{ opacity: [0.15, 1, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="6" y="42" width="88" height="16" fill="rgba(88,231,255,0.5)" />
        <rect x="20" y="30" width="40" height="14" fill="rgba(88,231,255,0.5)" />
        <rect x="30" y="20" width="14" height="12" fill="rgba(88,231,255,0.5)" />
        <rect x="0" y="58" width="100" height="6" fill="rgba(88,231,255,0.25)" />
        <text x="50" y="125" fill={C.green} fontSize="10" fontFamily={MONO} textAnchor="middle">
          ✓ vessel class ID
        </text>
      </motion.g>

      <text x="200" y="214" fill={C.txtFaint} fontSize="10" fontFamily={MONO} textAnchor="middle">
        lower metres = sharper = smaller objects resolved
      </text>
    </svg>
  );
}

/* RELIABILITY — repeated tasking attempts; a low-reliability bird misses */
function ReliabilityAnim() {
  return (
    <svg viewBox="0 0 400 230" width="100%" height="100%">
      <text x="200" y="24" fill={C.txtDim} fontSize="10" fontFamily={MONO} textAnchor="middle">
        ONE-SHOT WINDOW — the tasking must succeed
      </text>

      {/* high reliability row */}
      <text x="20" y="80" fill={C.green} fontSize="11" fontFamily={MONO}>0.94</text>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.circle
          key={"h" + i}
          cx={120 + i * 45}
          cy="75"
          r="9"
          fill={C.green}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
      <text x="350" y="80" fill={C.green} fontSize="10" fontFamily={MONO}>✓✓✓</text>

      {/* low reliability row — one attempt fails (red) */}
      <text x="20" y="150" fill={C.red} fontSize="11" fontFamily={MONO}>0.79</text>
      {Array.from({ length: 5 }).map((_, i) => {
        const fails = i === 2;
        return (
          <motion.circle
            key={"l" + i}
            cx={120 + i * 45}
            cy="145"
            r="9"
            fill={fails ? C.red : "rgba(87,242,164,0.5)"}
            animate={fails ? { opacity: [1, 0.1, 1], scale: [1, 0.6, 1] } : { opacity: [0.25, 0.8, 0.25] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
          />
        );
      })}
      <motion.text
        x="350" y="150" fill={C.red} fontSize="10" fontFamily={MONO}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ✕ MISS
      </motion.text>

      <text x="200" y="205" fill={C.amber} fontSize="10" fontFamily={MONO} textAnchor="middle">
        gate: reliability ≥ 0.85 — below it, tasking is not trusted
      </text>
    </svg>
  );
}

/* DEADLINE — pipeline stages fill left→right racing a clock */
function DeadlineAnim() {
  const stages = ["TASK", "ACCESS", "ACQ", "DOWNLINK", "PROC"];
  return (
    <svg viewBox="0 0 400 230" width="100%" height="100%">
      <text x="200" y="22" fill={C.txtDim} fontSize="10" fontFamily={MONO} textAnchor="middle">
        FULL PIPELINE must finish ≤ 360 min
      </text>

      {/* stage track */}
      {stages.map((s, i) => (
        <g key={s} transform={`translate(${24 + i * 74}, 60)`}>
          <rect width="64" height="30" fill="rgba(88,231,255,0.06)" stroke="rgba(88,231,255,0.2)" />
          <motion.rect
            width="64"
            height="30"
            fill={C.cyan}
            style={{ transformOrigin: "left center", filter: `drop-shadow(0 0 6px ${C.cyan})` }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{
              duration: 5,
              times: [i * 0.16, i * 0.16 + 0.16, 0.92, 1],
              repeat: Infinity,
            }}
          />
          <text x="32" y="48" fill={C.ice} fontSize="9" fontFamily={MONO} textAnchor="middle">
            {s}
          </text>
        </g>
      ))}
      <text x="200" y="125" fill={C.txtFaint} fontSize="9" fontFamily={MONO} textAnchor="middle">
        tasking + access + acquisition + downlink + processing = TOTAL
      </text>

      {/* clock sweeping down */}
      <g transform="translate(200,175)">
        <circle r="24" fill="none" stroke="rgba(255,181,71,0.4)" strokeWidth="2" />
        <motion.line
          x1="0" y1="0" x2="0" y2="-20"
          stroke={C.amber}
          strokeWidth="2.5"
          style={{ transformOrigin: "0px 0px", filter: `drop-shadow(0 0 4px ${C.amber})` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        <circle r="3" fill={C.amber} />
      </g>
      <text x="200" y="222" fill={C.amber} fontSize="10" fontFamily={MONO} textAnchor="middle">
        beat the clock or the product misses the window
      </text>
    </svg>
  );
}

/* ============================================================= */

const TOPICS: Topic[] = [
  {
    key: "off-nadir",
    label: "OFF-NADIR",
    req: "≥ 35°",
    title: "Off-Nadir (Look) Angle",
    what: (
      <>
        <b>Nadir</b> is the point straight below the satellite, on its ground
        track. <b>Off-nadir</b> is how far the sensor can tilt (slew) its
        look-angle away from that straight-down line to point at a target that
        is <b>off to the side</b> of the orbit path.
      </>
    ),
    impact: (
      <>
        <b>IMPACT:</b> The channel lies well off the ground track. A provider
        that can only slew 20° physically cannot put the target in frame —
        geometry eliminates it before anything else matters. You need a sensor
        whose gimbal reaches <b>≥ 35°</b> off-nadir.
      </>
    ),
    anim: <OffNadirAnim />,
  },
  {
    key: "sensor",
    label: "SENSOR",
    req: "ALL-WEATHER",
    title: "Sensor Type — Optical vs SAR",
    what: (
      <>
        <b>Optical</b> sensors photograph reflected sunlight — they need
        daylight and a clear sky. <b>SAR</b> (Synthetic Aperture Radar) emits
        its own microwave pulse, so it sees at night and{" "}
        <b>penetrates cloud</b>.
      </>
    ),
    impact: (
      <>
        <b>IMPACT:</b> The target is under persistent monsoon cloud, at local
        night. Every optical provider returns nothing usable and is eliminated.
        Only an <b>all-weather (SAR)</b> sensor can image the channel.
      </>
    ),
    anim: <SensorAnim />,
  },
  {
    key: "gsd",
    label: "MAX GSD",
    req: "≤ 1.0 m",
    title: "Ground Sample Distance (Resolution)",
    what: (
      <>
        <b>GSD</b> is the ground size of one pixel. A 3.0 m GSD means each pixel
        covers 3 metres — fine for spotting <i>that</i> something is there,
        useless for telling <i>what</i> it is. Lower metres = sharper image.
      </>
    ),
    impact: (
      <>
        <b>IMPACT:</b> Analysts must read deck layout to confirm the vessel
        class, which needs finer than <b>1.0 m</b>. A wide stripmap at 3.0 m
        passes every other gate but still fails here — it can&rsquo;t resolve
        the target.
      </>
    ),
    anim: <GsdAnim />,
  },
  {
    key: "reliability",
    label: "RELIABILITY",
    req: "≥ 0.85",
    title: "Reliability Score",
    what: (
      <>
        <b>Reliability</b> is the historical probability the constellation
        actually delivers a tasked acquisition. 0.94 means it succeeds 94% of
        the time; 0.79 means roughly one in five taskings is dropped.
      </>
    ),
    impact: (
      <>
        <b>IMPACT:</b> This is a one-shot window — if the tasking is dropped,
        the vessel is gone. A bird below <b>0.85</b> isn&rsquo;t trusted for the
        mission even when its optics look great on paper.
      </>
    ),
    anim: <ReliabilityAnim />,
  },
  {
    key: "deadline",
    label: "DEADLINE",
    req: "≤ 360 min",
    title: "Pipeline Deadline",
    what: (
      <>
        The finished product comes from a chain:{" "}
        <b>tasking → next-access → acquisition → downlink → processing</b>. The
        total of all five stages — not any single one — is what races the
        clock.
      </>
    ),
    impact: (
      <>
        <b>IMPACT:</b> The vessel leaves coverage in 6 hours (<b>360 min</b>). A
        provider can clear sensor, GSD, reliability and geometry yet still lose
        on a far next-access window or a slow downlink. Always sum the whole
        pipeline.
      </>
    ),
    anim: <DeadlineAnim />,
  },
];

export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0);
  const topic = TOPICS[active];

  // keyboard: Esc closes, arrows step through parameters
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, TOPICS.length - 1));
      if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className={styles.scrim}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`panel ${styles.modal}`}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            HELP · <span>PARAMETER FIELD GUIDE</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕ CLOSE (ESC)
          </button>
        </div>

        <div className={styles.body}>
          <nav className={styles.nav}>
            {TOPICS.map((t, i) => (
              <button
                key={t.key}
                className={`${styles.navItem} ${i === active ? styles.navItemActive : ""}`}
                onClick={() => setActive(i)}
              >
                <span className={styles.navIdx}>PARAM {i + 1}</span>
                {t.label}
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            <AnimatePresence mode="wait">
              <motion.div
                key={topic.key}
                className={styles.stageWrap}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.topicTitle}>
                  {topic.title}
                  <span className={styles.topicReq}>GATE: {topic.req}</span>
                </div>

                <div className={styles.stage}>
                  <div className={styles.stageGrid} />
                  {topic.anim}
                </div>

                <p className={styles.what}>{topic.what}</p>
                <p className={styles.impact}>{topic.impact}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.footHint}>
          ↑ / ↓ TO STEP THROUGH PARAMETERS · ESC TO CLOSE · ANIMATIONS LOOP
        </div>
      </motion.div>
    </motion.div>
  );
}
