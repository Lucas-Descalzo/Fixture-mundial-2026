import { GroupPageClient } from "@/components/group-page-client";
import styles from "@/components/group-page.module.css";
import { getPublicPoolPageData } from "@/lib/group-service";

export const dynamic = "force-dynamic";

export default async function PublicPoolPage() {
  const data = await getPublicPoolPageData();

  if (!data) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Tabla general</p>
            <h1>No disponible</h1>
            <p>La base de datos todavia no esta configurada.</p>
          </div>
        </section>
      </main>
    );
  }

  return <GroupPageClient data={data} />;
}
