"use client";

import Image from "next/image";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { groups, teamMap } from "@/data/world-cup-2026";
import {
  deriveMatches,
  getChampion,
  getThirdPlaceCandidates,
  getThirdPlaceSlotOptions,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import { isFixtureComplete } from "@/lib/group-utils";
import { getTeamFlagAsset } from "@/lib/team-flag-assets";
import type {
  DerivedMatch,
  FixtureState,
  GroupId,
  MatchId,
  TeamId,
  ThirdPlaceMatchId,
} from "@/lib/world-cup-types";
import { THIRD_PLACE_MATCH_IDS } from "@/lib/world-cup-types";

import { TournamentBracket } from "./tournament-bracket";
import { FixturePoster } from "./fixture-poster";
import styles from "./world-cup-app.module.css";

function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function createEmptyKnockoutMatches(matches: Record<MatchId, DerivedMatch>) {
  return Object.fromEntries(
    Object.entries(matches).map(([matchId, match]) => [
      matchId,
      {
        ...match,
        sideA: null,
        sideB: null,
        sideALabel: "Por definir",
        sideBLabel: "Por definir",
        winnerId: undefined,
        loserId: undefined,
      },
    ]),
  ) as Record<MatchId, DerivedMatch>;
}

export function TeamBadge({
  teamId,
  small = false,
}: {
  teamId: TeamId;
  small?: boolean;
}) {
  const team = teamMap[teamId];
  const flagAsset = getTeamFlagAsset(teamId);

  return (
    <span className={small ? styles.teamBadgeSmall : styles.teamBadge}>
      {flagAsset ? (
        <span className={small ? styles.teamFlagImageSmall : styles.teamFlagImage}>
          <Image
            src={flagAsset}
            alt={`Bandera de ${team.shortName}`}
            fill
            sizes={small ? "20px" : "24px"}
            className={styles.teamFlagAsset}
          />
        </span>
      ) : (
        <span className={styles.teamFlag}>{team.flag}</span>
      )}
      <span className={styles.teamCode}>{team.code}</span>
    </span>
  );
}

interface FixtureBuilderProps {
  fixtureState: FixtureState;
  onFixtureStateChange: (state: FixtureState) => void;
  readOnly?: boolean;
  beforeBuilder?: ReactNode;
  afterChampion?: ReactNode;
}

export function FixtureBuilder({
  fixtureState,
  onFixtureStateChange,
  readOnly = false,
  beforeBuilder,
  afterChampion,
}: FixtureBuilderProps) {
  const [isThirdAssignmentEditorOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");
  const exportPosterRef = useRef<HTMLDivElement | null>(null);

  const updateState = (next: Partial<FixtureState>) => {
    startTransition(() => {
      onFixtureStateChange(normalizeFixtureState({ ...fixtureState, ...next }));
    });
  };

  const matches = deriveMatches(fixtureState).matchesById;
  const emptyMatches = createEmptyKnockoutMatches(matches);
  const champion = getChampion(matches);
  const thirdCandidates = getThirdPlaceCandidates(fixtureState.groupOrders);
  const selectedThirds = fixtureState.qualifiedThirdPlaces.map((teamId) => teamMap[teamId]);
  const availableThirds = thirdCandidates.filter(
    (team) => !fixtureState.qualifiedThirdPlaces.includes(team.id),
  );
  const thirdSlotOptions = getThirdPlaceSlotOptions(fixtureState.qualifiedThirdPlaces);
  const thirdAssignmentCount = Object.keys(fixtureState.thirdPlaceAssignments).length;
  const hasEightThirdsSelected = fixtureState.qualifiedThirdPlaces.length === 8;
  const canEditThirdAssignments = hasEightThirdsSelected;
  const isThirdAssignmentEditorVisible =
    !readOnly && canEditThirdAssignments && isThirdAssignmentEditorOpen;
  const allThirdSlotsReady =
    hasEightThirdsSelected && thirdAssignmentCount === 8;
  const isKnockoutReady = allThirdSlotsReady;
  const isComplete = isFixtureComplete(fixtureState);
  const generatedAtLabel = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  useEffect(() => {
    if (!exportFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExportFeedback("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [exportFeedback]);

  const moveTeamInGroup = (groupId: GroupId, index: number, direction: -1 | 1) => {
    if (readOnly) {
      return;
    }

    const currentOrder = [...fixtureState.groupOrders[groupId]];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= currentOrder.length) {
      return;
    }

    [currentOrder[index], currentOrder[targetIndex]] = [
      currentOrder[targetIndex],
      currentOrder[index],
    ];

    updateState({
      groupOrders: {
        ...fixtureState.groupOrders,
        [groupId]: currentOrder,
      },
    });
  };

  const addThirdPlaceTeam = (teamId: TeamId) => {
    if (
      readOnly ||
      fixtureState.qualifiedThirdPlaces.includes(teamId) ||
      fixtureState.qualifiedThirdPlaces.length >= 8
    ) {
      return;
    }

    updateState({
      qualifiedThirdPlaces: [...fixtureState.qualifiedThirdPlaces, teamId],
    });
  };

  const removeThirdPlaceTeam = (teamId: TeamId) => {
    if (readOnly) {
      return;
    }

    updateState({
      qualifiedThirdPlaces: fixtureState.qualifiedThirdPlaces.filter(
        (selectedTeamId) => selectedTeamId !== teamId,
      ),
    });
  };

  const updateThirdPlaceSlot = (matchId: ThirdPlaceMatchId, teamId: TeamId) => {
    if (readOnly) {
      return;
    }

    const nextAssignments = { ...fixtureState.thirdPlaceAssignments };
    for (const currentMatchId of Object.keys(nextAssignments) as ThirdPlaceMatchId[]) {
      if (nextAssignments[currentMatchId] === teamId) {
        delete nextAssignments[currentMatchId];
      }
    }

    nextAssignments[matchId] = teamId;

    updateState({
      thirdPlaceAssignments: nextAssignments,
    });
  };

  const restoreSuggestedThirdAssignments = () => {
    if (readOnly) {
      return;
    }

    updateState({
      thirdPlaceAssignments: {},
    });
  };

  const pickMatchWinner = (matchId: MatchId, teamId: TeamId) => {
    if (readOnly) {
      return;
    }

    const currentWinner = fixtureState.knockoutWinners[matchId];
    const nextWinners = { ...fixtureState.knockoutWinners };

    if (currentWinner === teamId) {
      delete nextWinners[matchId];
    } else {
      nextWinners[matchId] = teamId;
    }

    updateState({
      knockoutWinners: nextWinners,
    });
  };

  const exportFixtureImage = async () => {
    const posterElement = exportPosterRef.current;

    if (!isComplete || !posterElement) {
      return;
    }

    setIsExportingImage(true);
    setExportFeedback("");

    try {
      const { toBlob } = await import("html-to-image");

      const blob = await toBlob(posterElement, {
        cacheBust: true,
        backgroundColor: "#08101d",
        pixelRatio: 2,
        width: posterElement.scrollWidth,
        height: posterElement.scrollHeight,
      });

      if (!blob) {
        throw new Error("image-export-failed");
      }

      const fileName = `fixture-mundial-2026-${new Date().toISOString().slice(0, 10)}.png`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
      setExportFeedback("Imagen descargada.");
    } catch (error) {
      console.error(error);
      setExportFeedback("No pude generar la imagen ahora.");
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <>
      {beforeBuilder}

      <section id="grupos" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 1</p>
            <h2>{readOnly ? "Orden final de los grupos" : "Ordena los grupos"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Esta prediccion muestra el orden final que se guardo para cada grupo."
              : "Move cada seleccion hasta dejar 1, 2, 3 y 4. La app recalcula todo el cuadro."}
          </p>
        </div>

        <div className={styles.groupGrid}>
          {groups.map((group) => (
            <article
              key={group.id}
              className={styles.groupCard}
              style={
                {
                  "--group-color": group.color,
                  "--group-accent": group.accent,
                } as CSSProperties
              }
            >
              <header className={styles.groupHeader}>
                <div>
                  <p className={styles.groupLabel}>{group.label}</p>
                  <strong>
                    {fixtureState.groupOrders[group.id]
                      .map((teamId) => teamMap[teamId].code)
                      .join(" · ")}
                  </strong>
                </div>
                <span
                  className={styles.groupTag}
                  title={
                    readOnly
                      ? "Vista en modo lectura."
                      : "Podes mover cada seleccion hacia arriba o abajo para definir el orden final."
                  }
                >
                  {readOnly ? "Modo lectura" : "Podes reordenar"}
                </span>
              </header>

              <div className={styles.groupTeams}>
                {fixtureState.groupOrders[group.id].map((teamId, index) => {
                  const team = teamMap[teamId];
                  return (
                    <div key={team.id} className={styles.groupTeamRow}>
                      <div className={styles.groupTeamInfo}>
                        <span className={styles.groupPosition}>{index + 1}</span>
                        <TeamBadge teamId={team.id} />
                        <div className={styles.groupTeamText}>
                          <strong>{team.shortName}</strong>
                          <span>{team.code}</span>
                        </div>
                      </div>

                      {!readOnly ? (
                        <div className={styles.groupMoveControls}>
                          <button
                            type="button"
                            onClick={() => moveTeamInGroup(group.id, index, -1)}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTeamInGroup(group.id, index, 1)}
                            disabled={index === 3}
                          >
                            ↓
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="terceros" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 2</p>
            <h2>{readOnly ? "Terceros clasificados" : "Elegi los 8 terceros clasificados"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Se muestran las terceras selecciones que avanzan a 16avos."
              : "El orden no modifica los cruces: elegis quienes entran y la app los ubica con la matriz oficial."}
          </p>
        </div>

        <div className={styles.thirdsLayout}>
          <div className={styles.thirdColumn}>
            <div className={styles.columnHeader}>
              <h3>Clasifican a 16avos</h3>
              <span>{fixtureState.qualifiedThirdPlaces.length}/8</span>
            </div>

            {selectedThirds.length === 0 ? (
              <p className={styles.emptyState}>Todavia no hay terceros clasificados.</p>
            ) : (
              <div className={styles.thirdList}>
                {selectedThirds.map((team) => (
                  <div key={team.id} className={styles.thirdRowSelected}>
                    <div className={styles.thirdRank}>{team.group}</div>
                    <div className={styles.thirdTeamInfo}>
                      <TeamBadge teamId={team.id} />
                      <div>
                        <strong>{team.shortName}</strong>
                        <span>3° del Grupo {team.group}</span>
                      </div>
                    </div>
                    {!readOnly ? (
                      <div className={styles.thirdControls}>
                        <button type="button" onClick={() => removeThirdPlaceTeam(team.id)}>
                          Quitar
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readOnly ? (
            <div className={styles.thirdColumn}>
              <div className={styles.columnHeader}>
                <h3>Terceros disponibles</h3>
                <span>12</span>
              </div>

              <div className={styles.thirdList}>
                {availableThirds.map((team) => (
                  <div key={team.id} className={styles.thirdRowAvailable}>
                    <div className={styles.thirdTeamInfo}>
                      <TeamBadge teamId={team.id} />
                      <div>
                        <strong>{team.shortName}</strong>
                        <span>3° del Grupo {team.group}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addThirdPlaceTeam(team.id)}
                      disabled={fixtureState.qualifiedThirdPlaces.length >= 8}
                    >
                      Clasificar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section id="asignacion-terceros" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 3</p>
            <h2>Asignacion oficial de terceros</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Se muestra donde cae cada tercero segun la combinacion oficial de grupos."
              : "El usuario decide que terceros clasifican; la matriz oficial decide en que llave caen."}
          </p>
        </div>

        <div className={styles.assignmentSummaryCard}>
          <div className={styles.assignmentSummaryRow}>
            <div className={styles.assignmentSummaryCopy}>
              <p className={styles.assignmentSummaryEyebrow}>Autoasignacion</p>
              <h3>Terceros ubicados por combinacion oficial FIFA</h3>
              <p>
                {fixtureState.qualifiedThirdPlaces.length < 8
                  ? "Elegi ocho terceros clasificados para completar esta parte."
                  : allThirdSlotsReady
                    ? "La asignacion queda resuelta automaticamente y no depende del orden de seleccion."
                    : "La combinacion seleccionada todavia no pudo resolverse con la matriz oficial."}
              </p>
            </div>

            <div className={styles.assignmentSummaryStatus}>
              <strong>{thirdAssignmentCount}/8</strong>
              <span>
                {fixtureState.qualifiedThirdPlaces.length < 8
                  ? "Esperando terceros clasificados"
                  : allThirdSlotsReady
                    ? "Asignacion oficial lista"
                    : "Combinacion pendiente"}
              </span>
            </div>
          </div>
        </div>

        {!hasEightThirdsSelected ? (
          <p className={styles.emptyState}>
            Todavia faltan terceros clasificados para completar la autoasignacion.
          </p>
        ) : null}

        {isThirdAssignmentEditorVisible ? (
          <div className={styles.assignmentEditorShell}>
            <div className={styles.assignmentToolbar}>
              <div className={styles.assignmentLegend}>
                <strong>{thirdAssignmentCount}/8</strong>
                <span>terceros asignados a llaves de 16avos</span>
              </div>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={restoreSuggestedThirdAssignments}
              >
                Restaurar sugeridos
              </button>
            </div>

            <div className={styles.assignmentGrid}>
              {(Object.keys(thirdSlotOptions) as ThirdPlaceMatchId[]).map((matchId) => {
                const match = matches[matchId];
                const assignedTeamId = fixtureState.thirdPlaceAssignments[matchId];

                return (
                  <article key={matchId} className={styles.assignmentCard}>
                    <div className={styles.assignmentHeader}>
                      <div>
                        <p>{matchId}</p>
                        <strong>{match.sideALabel}</strong>
                      </div>
                      <span className={styles.assignmentDate}>
                        {formatMatchDate(match.meta.date)}
                      </span>
                    </div>

                    <label className={styles.assignmentSelectLabel}>
                      Tercero permitido
                      <select
                        value={assignedTeamId ?? ""}
                        onChange={(event) =>
                          updateThirdPlaceSlot(matchId, event.target.value as TeamId)
                        }
                      >
                        <option value="" disabled>
                          Elegi un tercero
                        </option>
                        {thirdSlotOptions[matchId].map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.shortName} · Grupo {team.group}
                          </option>
                        ))}
                      </select>
                    </label>

                    <p className={styles.assignmentMeta}>
                      {match.meta.venue} · {match.meta.city}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {allThirdSlotsReady ? (
          <div className={styles.assignmentGrid}>
            {THIRD_PLACE_MATCH_IDS.map((matchId) => {
              const assignedTeamId = fixtureState.thirdPlaceAssignments[matchId];
              const assignedTeam = assignedTeamId ? teamMap[assignedTeamId] : null;
              const match = matches[matchId];

              return (
                <article key={matchId} className={styles.assignmentCard}>
                  <div className={styles.assignmentHeader}>
                    <div>
                      <p>{matchId}</p>
                      <strong>{match.sideALabel}</strong>
                    </div>
                    <span className={styles.assignmentDate}>
                      {formatMatchDate(match.meta.date)}
                    </span>
                  </div>

                  <p className={styles.assignmentMeta}>
                    {assignedTeam
                      ? `${assignedTeam.shortName} · Grupo ${assignedTeam.group}`
                      : "Sin tercero asignado"}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section id="cuadro" className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Paso 4</p>
            <h2>{readOnly ? "Cuadro final guardado" : "Completa el cuadro final"}</h2>
          </div>
          <p className={styles.sectionHint}>
            {readOnly
              ? "Esta vista conserva las selecciones guardadas hasta la final."
              : isKnockoutReady
                ? "Cada partido muestra la fecha por defecto. Toca el boton de info para ver sede y numero oficial, y elige una seleccion para marcar ganadora."
                : "El cuadro se habilita cuando elegis los ocho mejores terceros clasificados."}
          </p>
        </div>

        <div className={styles.championBand}>
          <div>
            <p className={styles.sectionEyebrow}>Campeon proyectado</p>
            <h3>
              {!isKnockoutReady
                ? "Cuadro pendiente"
                : champion
                  ? champion.shortName
                  : "Todavia sin campeon"}
            </h3>
            <p>
              {!isKnockoutReady
                ? "Primero defini los mejores terceros para que aparezcan los cruces oficiales."
                : champion
                ? `La prediccion levanta la copa en ${matches.M104.meta.city}.`
                : "Hace falta completar todos los cruces hasta la final para cerrar la prediccion."}
            </p>
          </div>
          {isKnockoutReady && champion ? <TeamBadge teamId={champion.id} /> : null}
        </div>

        <div className={styles.exportPanel}>
          <div className={styles.exportCopy}>
            <p className={styles.sectionEyebrow}>Exportar imagen</p>
            <h3>Guarda tu cuadro final como imagen</h3>
            <p>
              Genera una imagen prolija del cuadro final con fechas y calidad lista para
              descargar.
            </p>
          </div>

          <div className={styles.exportActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={exportFixtureImage}
              disabled={!isKnockoutReady || !isComplete || isExportingImage}
            >
              {isExportingImage
                ? "Generando imagen..."
                : !isKnockoutReady
                  ? "Elegi los 8 terceros para exportar"
                  : isComplete
                  ? "Descargar imagen PNG"
                  : "Completa el cuadro para exportar"}
            </button>
            {exportFeedback ? <p className={styles.exportFeedback}>{exportFeedback}</p> : null}
          </div>
        </div>

        {afterChampion}

        <TournamentBracket
          matchesById={isKnockoutReady ? matches : emptyMatches}
          onPickWinner={isKnockoutReady && !readOnly ? pickMatchWinner : undefined}
          readOnly={readOnly || !isKnockoutReady}
        />

        {isKnockoutReady ? (
          <div className={styles.posterCaptureRoot} aria-hidden>
            <FixturePoster
              ref={exportPosterRef}
              matchesById={matches}
              championName={champion?.shortName ?? "Sin campeon definido"}
              generatedAtLabel={generatedAtLabel}
              title={readOnly ? "Fixture guardado Mundial 2026" : "Tu fixture Mundial 2026"}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}
