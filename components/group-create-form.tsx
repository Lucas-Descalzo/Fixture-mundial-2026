"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ScoringExplainer } from "./scoring-explainer";
import styles from "./group-page.module.css";

function sanitizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function composeDeadlineLocal(
  day: string,
  month: string,
  year: string,
  hour: string,
  minute: string,
) {
  if (
    day.length !== 2 ||
    month.length !== 2 ||
    year.length !== 4 ||
    hour.length !== 2 ||
    minute.length !== 2
  ) {
    return null;
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function GroupCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("2026");
  const [hour, setHour] = useState("18");
  const [minute, setMinute] = useState("00");
  const [scoringEnabled, setScoringEnabled] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback("");

    const deadlineLocal = composeDeadlineLocal(day, month, year, hour, minute);
    if (!deadlineLocal) {
      setFeedback("Completa la fecha y la hora en formato dd/mm/aaaa.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          deadlineLocal,
          scoringEnabled,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        url?: string;
        message?: string;
      };

      if (!response.ok || !payload.ok || !payload.url) {
        setFeedback(payload.message ?? "No pudimos crear el grupo.");
        return;
      }

      router.push(payload.url);
    } catch {
      setFeedback("No pudimos crear el grupo en este momento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <p className={styles.eyebrow}>Nuevo grupo</p>
        <h1>Crea un grupo para jugar con amigos</h1>
        <p>
          La fecha limite se interpreta y se muestra siempre en horario Argentina
          (GMT-3).
        </p>
      </div>

      <label className={styles.field}>
        <span>Nombre del grupo</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Hueco"
          maxLength={60}
          required
        />
      </label>

      <div className={styles.field}>
        <div className={styles.deadlineLabelRow}>
          <span>Fecha y hora limite</span>
          <small>(El primer partido es el 11/06)</small>
        </div>

        <div className={styles.deadlineComposer}>
          <div className={styles.deadlineBlock}>
            <div className={styles.deadlineInputs}>
              <input
                type="text"
                inputMode="numeric"
                value={day}
                onChange={(event) => setDay(sanitizeDigits(event.target.value, 2))}
                placeholder="dd"
                aria-label="Dia"
              />
              <span>/</span>
              <input
                type="text"
                inputMode="numeric"
                value={month}
                onChange={(event) => setMonth(sanitizeDigits(event.target.value, 2))}
                placeholder="mm"
                aria-label="Mes"
              />
              <span>/</span>
              <input
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(event) => setYear(sanitizeDigits(event.target.value, 4))}
                placeholder="aaaa"
                aria-label="Anio"
              />
            </div>
            <small>Formato dd/mm/aaaa</small>
          </div>

          <div className={styles.deadlineBlock}>
            <div className={styles.deadlineInputs}>
              <input
                type="text"
                inputMode="numeric"
                value={hour}
                onChange={(event) => setHour(sanitizeDigits(event.target.value, 2))}
                placeholder="hh"
                aria-label="Hora"
              />
              <span>:</span>
              <input
                type="text"
                inputMode="numeric"
                value={minute}
                onChange={(event) => setMinute(sanitizeDigits(event.target.value, 2))}
                placeholder="mm"
                aria-label="Minutos"
              />
            </div>
            <small>Horario Argentina (GMT-3)</small>
          </div>
        </div>
      </div>

      <label className={styles.switchField}>
        <input
          type="checkbox"
          checked={scoringEnabled}
          onChange={(event) => setScoringEnabled(event.target.checked)}
        />
        <span>
          <strong>Jugar con ranking por puntos</strong>
          <small>
            Si lo activas, cuando Lucas cargue los resultados reales el grupo vera una
            tabla de posiciones.
          </small>
        </span>
      </label>

      <ScoringExplainer compact />

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear grupo"}
        </button>
        <Link href="/" className={styles.secondaryButton}>
          Volver al fixture
        </Link>
      </div>

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
    </form>
  );
}
