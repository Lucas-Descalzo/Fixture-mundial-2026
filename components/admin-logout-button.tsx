"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin.module.css";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);

    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
      {isSubmitting ? "Saliendo..." : "Cerrar sesion"}
    </button>
  );
}
