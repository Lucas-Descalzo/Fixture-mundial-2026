"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin.module.css";

interface AdminScoringToggleProps {
  groupId: string;
  initialEnabled: boolean;
}

export function AdminScoringToggle({
  groupId,
  initialEnabled,
}: AdminScoringToggleProps) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const updateScoring = async (nextEnabled: boolean) => {
    setIsEnabled(nextEnabled);
    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/groups/${groupId}/scoring`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringEnabled: nextEnabled }),
      });

      if (!response.ok) {
        setIsEnabled(!nextEnabled);
        const payload = (await response.json()) as { message?: string };
        setFeedback(payload.message ?? "No pude actualizar el ranking.");
        return;
      }

      router.refresh();
    } catch {
      setIsEnabled(!nextEnabled);
      setFeedback("No pude actualizar el ranking ahora.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <label className={styles.adminSwitch}>
      <input
        type="checkbox"
        checked={isEnabled}
        disabled={isSubmitting}
        onChange={(event) => updateScoring(event.target.checked)}
      />
      <span>{isEnabled ? "Ranking activo" : "Ranking apagado"}</span>
      {feedback ? <small>{feedback}</small> : null}
    </label>
  );
}
