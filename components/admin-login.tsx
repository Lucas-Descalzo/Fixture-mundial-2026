"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin.module.css";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setFeedback(payload.message ?? "Clave incorrecta.");
        return;
      }

      router.refresh();
    } catch {
      setFeedback("No pude validar la clave ahora.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.loginCard} onSubmit={handleSubmit}>
      <div className={styles.loginHeader}>
        <p className={styles.eyebrow}>Acceso privado</p>
        <h1>Panel admin</h1>
        <p>Ingresa tu clave para ver grupos, fixtures guardados y actividad.</p>
      </div>

      <label className={styles.field}>
        <span>Clave</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tu clave admin"
        />
      </label>

      <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Entrar al panel"}
      </button>

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
    </form>
  );
}
