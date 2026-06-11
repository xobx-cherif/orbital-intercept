"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setError(data.error ?? "Login failed.");
      }
    } catch {
      setError("Uplink failure. Retry transmission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      className={`panel ${styles.card}`}
      onSubmit={submit}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.head}>
        <span className="tag">SECURE TERMINAL · OPERATOR SIGN-IN</span>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>OPERATOR ID</span>
        <input
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="operatorNN"
          autoComplete="username"
          autoFocus
          spellCheck={false}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>ACCESS CODE</span>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          autoComplete="current-password"
        />
      </label>

      {error && <div className={styles.error}>✕ {error}</div>}

      <button className={styles.submit} type="submit" disabled={busy}>
        {busy ? "AUTHENTICATING…" : "AUTHENTICATE ▸"}
      </button>
    </motion.form>
  );
}
