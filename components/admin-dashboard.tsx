import Link from "next/link";

import type { AdminDashboardData } from "@/lib/admin-service";
import { formatArgentinaDateTime } from "@/lib/group-utils";

import { AdminDeleteButton } from "./admin-delete-button";
import { AdminLogoutButton } from "./admin-logout-button";
import { AdminOfficialResultsEditor } from "./admin-official-results-editor";
import { AdminScoringToggle } from "./admin-scoring-toggle";
import styles from "./admin.module.css";

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Panel admin</p>
          <h1>Grupos, fixtures y actividad</h1>
          <p>Vista interna para seguir el uso real del proyecto.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/" className={styles.secondaryButton}>
            Volver al sitio
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Grupos creados</p>
          <strong>{data.totalGroups}</strong>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Fixtures guardados</p>
          <strong>{data.totalEntries}</strong>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Tabla general</p>
          <strong>{data.totalPublicPoolEntries}</strong>
        </article>
      </section>

      <AdminOfficialResultsEditor
        initialFixtureState={data.officialFixtureState}
        updatedAt={data.officialResultsUpdatedAt}
      />

      <section className={styles.panelGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Ranking</p>
              <h2>Tabla general</h2>
            </div>
          </div>

          {data.globalRanking.length === 0 ? (
            <p className={styles.emptyState}>
              {data.officialFixtureState
                ? "Todavia no hay predicciones en la tabla general."
                : "Carga resultados reales para habilitar puntajes."}
            </p>
          ) : (
            <div className={styles.rankingList}>
              {data.globalRanking.map((row, index) => (
                <div key={row.entryId} className={styles.rankingRow}>
                  <strong>#{index + 1}</strong>
                  <span>{row.displayName}</span>
                  <b>{row.score.total} pts</b>
                  <small>{row.score.scoredUnits} unidades puntuadas</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Grupos con puntos</p>
              <h2>Rankings por grupo</h2>
            </div>
          </div>

          {data.groupRankings.length === 0 ? (
            <p className={styles.emptyState}>No hay grupos con ranking activo todavia.</p>
          ) : (
            <div className={styles.rankingList}>
              {data.groupRankings.map((group) => (
                <div key={group.groupId} className={styles.groupRankingBlock}>
                  <strong>{group.groupName}</strong>
                  {group.ranking.slice(0, 5).map((row, index) => (
                    <div key={row.entryId} className={styles.miniRankingRow}>
                      <span>#{index + 1} {row.displayName}</span>
                      <b>{row.score.total} pts</b>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.panelGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Grupos</p>
              <h2>Todos los grupos</h2>
            </div>
          </div>

          <div className={styles.tableLike}>
            {data.latestGroups.length === 0 ? (
              <p className={styles.emptyState}>Todavia no hay grupos guardados.</p>
            ) : (
              data.latestGroups.map((group) => (
                <div key={group.id} className={styles.tableRow}>
                  <div className={styles.tableMain}>
                    <strong>{group.name}</strong>
                    <span>/{group.slug}</span>
                  </div>
                  <div className={styles.tableMeta}>
                    <span>{group.participants} participantes</span>
                    <span>Cierra: {formatArgentinaDateTime(group.deadlineAtUtc)}</span>
                    <span>
                      {group.isPublicPool
                        ? "Pool publico"
                        : group.scoringEnabled
                          ? "Ranking activo"
                          : "Sin ranking"}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Link
                      href={group.isPublicPool ? "/tabla-general" : `/grupos/${group.slug}`}
                      className={styles.inlineLink}
                    >
                      Abrir {group.isPublicPool ? "tabla" : "grupo"}
                    </Link>
                    {!group.isPublicPool ? (
                      <>
                        <AdminScoringToggle
                          groupId={group.id}
                          initialEnabled={group.scoringEnabled}
                        />
                        <AdminDeleteButton
                          entityLabel={`el grupo ${group.name}`}
                          endpoint={`/api/admin/groups/${group.id}`}
                          confirmMessage={`Vas a eliminar el grupo "${group.name}" y todos sus fixtures. Esta accion no se puede deshacer.`}
                          idleLabel="Eliminar grupo"
                          pendingLabel="Eliminando..."
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Fixtures</p>
              <h2>Todos los fixtures guardados</h2>
            </div>
          </div>

          <div className={styles.tableLike}>
            {data.latestEntries.length === 0 ? (
              <p className={styles.emptyState}>Todavia no hay fixtures guardados.</p>
            ) : (
              data.latestEntries.map((entry) => (
                <div key={entry.id} className={styles.tableRow}>
                  <div className={styles.tableMain}>
                    <strong>
                      {entry.firstName} {entry.lastName}
                    </strong>
                    <span>{entry.groupName}</span>
                  </div>
                  <div className={styles.tableMeta}>
                    <span>Actualizado: {formatArgentinaDateTime(entry.updatedAt)}</span>
                    <span>{Object.keys(entry.fixtureState.knockoutWinners).length} picks knockout</span>
                  </div>
                  <div className={styles.rowActions}>
                    <Link href={`/grupos/${entry.groupSlug}`} className={styles.inlineLink}>
                      Ver grupo
                    </Link>
                    <AdminDeleteButton
                      entityLabel={`el fixture de ${entry.firstName} ${entry.lastName}`}
                      endpoint={`/api/admin/entries/${entry.id}`}
                      confirmMessage={`Vas a eliminar el fixture de ${entry.firstName} ${entry.lastName}. Esta accion no se puede deshacer.`}
                      idleLabel="Eliminar fixture"
                      pendingLabel="Eliminando..."
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
