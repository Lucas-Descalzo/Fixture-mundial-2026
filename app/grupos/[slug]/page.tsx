import { notFound } from "next/navigation";

import { GroupPageClient } from "@/components/group-page-client";
import styles from "@/components/group-page.module.css";
import { isDatabaseConfigured } from "@/lib/db";
import { getGroupPageData } from "@/lib/group-service";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const databaseConfigured = isDatabaseConfigured();

  if (!databaseConfigured) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}>Base de datos pendiente</p>
            <h1>Conecta Neon para habilitar este grupo</h1>
            <p>
              Esta ruta existe y el codigo esta implementado, pero este entorno no tiene
              `DATABASE_URL`. Una vez conectada la base y creadas las tablas, esta pagina
              va a funcionar sin tocar mas codigo.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const data = await getGroupPageData(slug);

  if (!data) {
    notFound();
  }

  return <GroupPageClient data={data} />;
}
