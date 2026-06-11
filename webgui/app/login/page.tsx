import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/session.server";
import styles from "@/components/login.module.css";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Already signed in → go to the dashboard.
  if (getSession()) redirect("/");

  return (
    <main className={styles.wrap}>
      <div className={styles.brand}>
        <h1 className={styles.brandTitle}>
          ORBITAL<span>INTERCEPT</span>
        </h1>
        <div className={styles.brandSub}>
          Satellite Tasking Range · Gulf Theatre (Training)
        </div>
      </div>
      <LoginForm />
      <div className={styles.hint}>
        CLASS // EYES ONLY · CREDENTIALS ISSUED BY YOUR INSTRUCTOR
      </div>
    </main>
  );
}
