import Link from "next/link";

import { isDatabaseConfigured } from "@/lib/db";

import { GroupCreateForm } from "@/components/group-create-form";
import styles from "@/components/group-page.module.css";

export default function NewGroupPage() {
  const databaseConfigured = isDatabaseConfigured();

  return (
    <main className={styles.pageShell}>
      {databaseConfigured ? (
        <GroupCreateForm />
      ) : (
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}>Base de datos pendiente</p>
            <h1>Conecta Neon para habilitar grupos</h1>
            <p>
              El codigo ya esta listo, pero este entorno todavia no tiene
              `DATABASE_URL`. Instala Neon desde Vercel Marketplace, crea las tablas de
              `db/groups-schema.sql` y luego vas a poder crear grupos.
            </p>
          </div>

          <div className={styles.formActions}>
            <Link href="/" className={styles.secondaryButton}>
              Volver al fixture
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
