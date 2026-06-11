"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DashScenario } from "./Dashboard";
import styles from "./completion.module.css";

export default function CompletionModal({
  operator,
  scenarios,
  onClose,
}: {
  operator: string;
  scenarios: DashScenario[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solved = scenarios.filter((s) => s.status === "solved").length;
  const total = scenarios.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    const clean = name.trim();
    if (!clean) {
      setError("Please enter your name for the certificate.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [{ default: JsPDF }, { buildCertificate }] = await Promise.all([
        import("jspdf"),
        import("@/lib/certificate"),
      ]);
      const doc = buildCertificate(JsPDF, {
        name: clean,
        operator,
        solved,
        total,
        scenarios: scenarios.map((s) => ({
          codename: s.codename,
          kind: s.kind,
          status: s.status,
        })),
      });
      const safe = clean.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "operator";
      doc.save(`OrbitalIntercept_Certificate_${safe}.pdf`);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

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
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.flagStrip}>
          <span className={styles.fRed} />
          <span className={styles.fBands}>
            <span className={styles.fGreen} />
            <span className={styles.fWhite} />
            <span className={styles.fBlack} />
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.kicker}>MISSION COMPLETE</div>
          <h2 className={styles.title}>Proud of you!</h2>
          <p className={styles.sub}>
            You worked through all <b>{total}</b> assigned scenarios and solved{" "}
            <b className={styles.score}>{solved}/{total}</b>. Enter your name to
            claim your certificate.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>YOUR NAME</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fatima Al Mansoori"
              autoFocus
              maxLength={48}
              onKeyDown={(e) => {
                if (e.key === "Enter") download();
              }}
            />
          </label>

          {error && <div className={styles.error}>✕ {error}</div>}

          <div className={styles.actions}>
            <button className={styles.secondary} onClick={onClose} disabled={busy}>
              NOT YET
            </button>
            <button className={styles.primary} onClick={download} disabled={busy}>
              {busy ? "GENERATING…" : "DOWNLOAD CERTIFICATE (PDF) ▾"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
