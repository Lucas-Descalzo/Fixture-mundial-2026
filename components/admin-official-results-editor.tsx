"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

import { FixtureBuilder } from "./fixture-builder";
import styles from "./admin.module.css";

interface AdminOfficialResultsEditorProps {
  initialFixtureState: FixtureState | null;
  updatedAt: string | null;
}

export function AdminOfficialResultsEditor({
  initialFixtureState,
  updatedAt,
}: AdminOfficialResultsEditorProps) {
  const router = useRouter();
  const [fixtureState, setFixtureState] = useState<FixtureState>(
    initialFixtureState ?? createInitialFixtureState(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const saveOfficialResults = async () => {
    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch("/api/admin/official-results", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureState }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.message ?? "No pude guardar los resultados reales.");
        return;
      }

      setFeedback("Resultados reales guardados.");
      router.refresh();
    } catch {
      setFeedback("No pude guardar los resultados reales ahora.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.officialResultsPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Resultados reales</p>
          <h2>Fixture oficial para puntuar</h2>
        </div>
        <p>
          Carga manualmente ganadores reales. El scoring se actualiza contra este
          fixture en tabla general y grupos con ranking activo.
        </p>
      </div>

      <div className={styles.officialResultsActions}>
        <span>
          {updatedAt ? `Ultima actualizacion: ${new Date(updatedAt).toLocaleString("es-AR")}` : "Todavia sin resultados guardados."}
        </span>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={saveOfficialResults}
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar resultados reales"}
        </button>
      </div>

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

      <div className={styles.officialBuilderWrap}>
        <FixtureBuilder
          fixtureState={fixtureState}
          onFixtureStateChange={setFixtureState}
          beforeBuilder={null}
          afterChampion={null}
        />
      </div>
    </section>
  );
}
