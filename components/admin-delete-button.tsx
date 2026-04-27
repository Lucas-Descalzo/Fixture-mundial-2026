"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin.module.css";

type AdminDeleteButtonProps = {
  entityLabel: string;
  endpoint: string;
  confirmMessage: string;
  idleLabel: string;
  pendingLabel: string;
};

export function AdminDeleteButton({
  entityLabel,
  endpoint,
  confirmMessage,
  idleLabel,
  pendingLabel,
}: AdminDeleteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleDelete = async () => {
    const shouldContinue = window.confirm(confirmMessage);
    if (!shouldContinue) {
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setFeedback(payload.message ?? `No pude eliminar ${entityLabel}.`);
        return;
      }

      router.refresh();
    } catch {
      setFeedback(`No pude eliminar ${entityLabel} ahora.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.destructiveWrap}>
      <button
        type="button"
        className={styles.destructiveButton}
        onClick={handleDelete}
        disabled={isSubmitting}
      >
        {isSubmitting ? pendingLabel : idleLabel}
      </button>

      {feedback ? <p className={styles.inlineFeedback}>{feedback}</p> : null}
    </div>
  );
}
