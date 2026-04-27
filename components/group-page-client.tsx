"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createInitialFixtureState } from "@/lib/world-cup-fixture";
import type { GroupPageData } from "@/lib/group-types";
import {
  formatArgentinaDateTime,
  getRemainingKnockoutMatchesCount,
} from "@/lib/group-utils";
import { decodeFixtureState, encodeFixtureState } from "@/lib/world-cup-state";
import type { FixtureState } from "@/lib/world-cup-types";

import { FixtureBuilder } from "./fixture-builder";
import { ScoringExplainer } from "./scoring-explainer";
import styles from "./group-page.module.css";

interface GroupPageClientProps {
  data: GroupPageData;
}

function getDraftKey(slug: string) {
  return `fwc26-group-draft:${slug}`;
}

export function GroupPageClient({ data }: GroupPageClientProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [fixtureState, setFixtureState] = useState<FixtureState>(createInitialFixtureState());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [hasSavedEntry, setHasSavedEntry] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    data.participants[0]?.id ?? "",
  );

  const isPublicPool = data.group.isPublicPool;
  const draftKey = useMemo(
    () => (isPublicPool ? "fwc26-public-pool-draft" : getDraftKey(data.group.slug)),
    [data.group.slug, isPublicPool],
  );
  const remainingMatches = getRemainingKnockoutMatchesCount(fixtureState);
  const selectedParticipant = data.participants.find(
    (participant) => participant.id === selectedParticipantId,
  );

  useEffect(() => {
    if (data.isClosed) {
      return;
    }

    const draft = window.localStorage.getItem(draftKey);
    const decoded = decodeFixtureState(draft);
    if (decoded) {
      setFixtureState(decoded);
    }
  }, [data.isClosed, draftKey]);

  useEffect(() => {
    if (data.isClosed) {
      return;
    }

    window.localStorage.setItem(draftKey, encodeFixtureState(fixtureState));
  }, [data.isClosed, draftKey, fixtureState]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const saveButtonLabel = data.isClosed
    ? "Predicciones cerradas"
    : remainingMatches > 0
      ? `Te faltan ${remainingMatches} partidos por definir`
      : hasSavedEntry
        ? "Actualizar mi fixture"
        : "Guardar mi fixture";
  const saveEndpoint = isPublicPool
    ? "/api/public-pool/entries"
    : `/api/groups/${data.group.slug}/entries`;
  const resumeEndpoint = isPublicPool
    ? "/api/public-pool/entries/resume"
    : `/api/groups/${data.group.slug}/entries/resume`;
  const introCopy = isPublicPool
    ? "Arma tu prediccion y entra a la tabla general del proyecto."
    : "Cada participante arma y guarda su propio fixture con nombre, apellido y clave.";
  const closedCopy = isPublicPool
    ? "La tabla general ya cerro y ahora podes recorrer las predicciones guardadas."
    : "Las predicciones ya cerraron y ahora podes recorrer los fixtures guardados.";
  const rankingTitle = isPublicPool ? "Ranking general" : "Ranking del grupo";

  const disableSave =
    data.isClosed ||
    isSaving ||
    !firstName.trim() ||
    !lastName.trim() ||
    !editKey.trim() ||
    remainingMatches > 0;

  const copyGroupLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback("Link del grupo copiado.");
    } catch {
      setFeedback("No pude copiar el link automaticamente.");
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setFeedback("");

    try {
      const response = await fetch(resumeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          editKey,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        fixtureState?: FixtureState;
        deadlineReached?: boolean;
        lockedUntilUtc?: string | null;
        message?: string;
      };

      if (!response.ok || !payload.ok || !payload.fixtureState) {
        if (payload.deadlineReached) {
          router.refresh();
          return;
        }

        if (payload.lockedUntilUtc) {
          setFeedback(
            `Tu participacion quedo bloqueada hasta ${formatArgentinaDateTime(payload.lockedUntilUtc)}.`,
          );
          return;
        }

        setFeedback(payload.message ?? "No pudimos validar esos datos.");
        return;
      }

      setFixtureState(payload.fixtureState);
      setHasSavedEntry(true);
      setFeedback("Recuperamos tu fixture guardado.");
    } catch {
      setFeedback("No pudimos recuperar tu fixture.");
    } finally {
      setIsResuming(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          editKey,
          fixtureState,
        }),
      });

      const payload = (await response.json()) as {
        saved?: boolean;
        remainingMatches?: number;
        isUpdate?: boolean;
        deadlineReached?: boolean;
        lockedUntilUtc?: string | null;
        message?: string;
      };

      if (!response.ok || !payload.saved) {
        if (payload.deadlineReached) {
          router.refresh();
          return;
        }

        if (payload.lockedUntilUtc) {
          setFeedback(
            `Tu participacion quedo bloqueada hasta ${formatArgentinaDateTime(payload.lockedUntilUtc)}.`,
          );
          return;
        }

        if (typeof payload.remainingMatches === "number" && payload.remainingMatches > 0) {
          setFeedback(`Te faltan ${payload.remainingMatches} partidos por definir.`);
          return;
        }

        setFeedback(payload.message ?? "No pudimos guardar tu fixture.");
        return;
      }

      setHasSavedEntry(true);
      setFeedback(payload.isUpdate ? "Tu fixture fue actualizado." : "Tu fixture quedo guardado.");
      router.refresh();
    } catch {
      setFeedback("No pudimos guardar tu fixture.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{isPublicPool ? "Tabla general" : "Grupo compartido"}</p>
          <h1>{data.group.name}</h1>
          <p>
            {data.isClosed
              ? closedCopy
              : introCopy}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={copyGroupLink}>
            Copiar link
          </button>
          <Link href="/" className={styles.secondaryButton}>
            Volver al home
          </Link>
        </div>
      </header>

      <motion.section
        className={styles.summaryGrid}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Estado</p>
          <strong>{data.isClosed ? "Cerrado" : "Abierto"}</strong>
          <span>
            Fecha limite: {formatArgentinaDateTime(data.group.deadlineAtUtc)}
          </span>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Participantes</p>
          <strong>{data.participants.length}</strong>
          <span>
            {data.isClosed
              ? "Podes revisar las predicciones guardadas."
              : "Por ahora solo se muestra quien ya participo."}
          </span>
        </article>
      </motion.section>

      <ScoringExplainer enabled={data.group.scoringEnabled} />

      {data.group.scoringEnabled ? (
        <section className={styles.rankingCard}>
          <div className={styles.cardHeader}>
            <p className={styles.eyebrow}>Puntaje</p>
            <h2>{rankingTitle}</h2>
            <p>
              {data.hasOfficialResults
                ? "Se actualiza con los resultados reales cargados manualmente desde el admin."
                : "Todavia no hay resultados reales cargados. Cuando se carguen, esta tabla empezara a sumar puntos."}
            </p>
          </div>

          {data.hasOfficialResults && data.ranking.length > 0 ? (
            <div className={styles.rankingTable}>
              {data.ranking.map((row, index) => (
                <div key={row.entryId} className={styles.rankingRow}>
                  <strong>#{index + 1}</strong>
                  <span>{row.displayName}</span>
                  <b>{row.total} pts</b>
                  <small>
                    {row.groupClassificationPoints + row.groupExactPositionPoints} grupos +{" "}
                    {row.roundOf32Points +
                      row.roundOf16Points +
                      row.quarterFinalPoints +
                      row.semiFinalPoints +
                      row.finalistPoints}{" "}
                    supervivencia +{" "}
                    {row.exactFinalBonus + row.championBonus + row.thirdPlaceBonus} bonus
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              {data.hasOfficialResults
                ? "Todavia no hay participantes para rankear."
                : "Ranking pendiente de resultados oficiales."}
            </p>
          )}
        </section>
      ) : null}

      {feedback ? <p className={styles.feedbackBanner}>{feedback}</p> : null}

      {!data.isClosed ? (
        <>
          <section className={styles.openLayout}>
            <article className={styles.identityCard}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Tu participacion</p>
                <h2>Nombre, apellido y clave</h2>
                <p>La clave te permite volver a editar hasta la fecha limite. No se recupera.</p>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Nombre"
                  />
                </label>
                <label className={styles.field}>
                  <span>Apellido</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Apellido"
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>Clave</span>
                <input
                  type="password"
                  value={editKey}
                  onChange={(event) => setEditKey(event.target.value)}
                  placeholder="Tu clave de edicion"
                />
              </label>

              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleResume}
                  disabled={isResuming || !firstName.trim() || !lastName.trim() || !editKey.trim()}
                >
                  {isResuming ? "Buscando..." : "Retomar mi fixture"}
                </button>
              </div>
            </article>

            <article className={styles.participantsCard}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Ya participaron</p>
                <h2>Participantes confirmados</h2>
                <p>
                  Antes del cierre solo se muestra quien ya cargo su fixture, no sus
                  elecciones.
                </p>
              </div>

              {data.participants.length === 0 ? (
                <p className={styles.emptyState}>Todavia nadie guardo su prediccion.</p>
              ) : (
                <ul className={styles.participantList}>
                  {data.participants.map((participant) => (
                    <li key={participant.id} className={styles.participantRow}>
                      <strong>{participant.displayName}</strong>
                      <span>{formatArgentinaDateTime(participant.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <FixtureBuilder
            fixtureState={fixtureState}
            onFixtureStateChange={setFixtureState}
            beforeBuilder={
              <section className={styles.savePanel}>
                <div>
                  <p className={styles.eyebrow}>Guardado del grupo</p>
                  <h2>Cuando el fixture este completo, lo guardas aca</h2>
                  <p>
                    Para aceptar el envio tenes que definir todos los partidos del knockout,
                    desde M73 hasta M104.
                  </p>
                </div>
                <div className={styles.savePanelActions}>
                  <strong>{remainingMatches === 0 ? "Fixture completo" : `${remainingMatches} pendientes`}</strong>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleSave}
                    disabled={disableSave}
                  >
                    {isSaving ? "Guardando..." : saveButtonLabel}
                  </button>
                </div>
              </section>
            }
          />
        </>
      ) : (
        <>
          <section className={styles.closedLayout}>
            <article className={styles.participantsCard}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Predicciones guardadas</p>
                <h2>Elegi una para verla</h2>
                <p>Las mostramos en orden alfabetico por nombre completo.</p>
              </div>

              {data.participants.length === 0 ? (
                <p className={styles.emptyState}>Este grupo cerro sin participantes guardados.</p>
              ) : (
                <div className={styles.closedParticipantList}>
                  {data.participants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className={`${styles.participantChoice} ${
                        participant.id === selectedParticipantId ? styles.participantChoiceActive : ""
                      }`}
                      onClick={() => setSelectedParticipantId(participant.id)}
                    >
                      <strong>{participant.displayName}</strong>
                      <span>{formatArgentinaDateTime(participant.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>

          {selectedParticipant?.fixtureState ? (
            <FixtureBuilder
              fixtureState={selectedParticipant.fixtureState}
              onFixtureStateChange={() => undefined}
              readOnly
              beforeBuilder={
                <section className={styles.readOnlyBanner}>
                  <div>
                    <p className={styles.eyebrow}>Prediccion seleccionada</p>
                    <h2>{selectedParticipant.displayName}</h2>
                    <p>Guardada por ultima vez el {formatArgentinaDateTime(selectedParticipant.updatedAt)}.</p>
                  </div>
                </section>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
