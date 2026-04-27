"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { knockoutSlots, stageLabels } from "@/data/world-cup-2026";
import { getTeamFlagAsset } from "@/lib/team-flag-assets";
import type {
  DerivedMatch,
  KnockoutSlot,
  MatchId,
  StageId,
  TeamId,
} from "@/lib/world-cup-types";

import styles from "./tournament-bracket.module.css";

type BracketSide = "left" | "right" | "center";
type NodeStatus = "winner" | "ready" | "pending";

interface TournamentBracketProps {
  matchesById: Record<MatchId, DerivedMatch>;
  onPickWinner?: (matchId: MatchId, teamId: TeamId) => void;
  readOnly?: boolean;
}

interface BracketCountryNodeProps {
  teamId?: TeamId;
  abbreviation?: string;
  label: string;
  status: NodeStatus;
  side: BracketSide;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

interface BracketMatchCardProps {
  match: DerivedMatch;
  side: BracketSide;
  onPickWinner?: (matchId: MatchId, teamId: TeamId) => void;
  expandedMatchInfoId: MatchId | null;
  onToggleInfo: (matchId: MatchId) => void;
  featured?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}

interface BracketMatchTreeProps {
  matchId: MatchId;
  side: Extract<BracketSide, "left" | "right">;
  matchesById: Record<MatchId, DerivedMatch>;
  onPickWinner?: (matchId: MatchId, teamId: TeamId) => void;
  expandedMatchInfoId: MatchId | null;
  onToggleInfo: (matchId: MatchId) => void;
  minVisibleStageIndex: number;
  readOnly?: boolean;
}

const knockoutSlotMap = Object.fromEntries(
  knockoutSlots.map((slot) => [slot.matchId, slot]),
) as Record<MatchId, KnockoutSlot>;

const focusableStages: StageId[] = [
  "roundOf32",
  "roundOf16",
  "quarterFinal",
  "semiFinal",
  "final",
];

function cn(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function getStageIndex(stage: StageId) {
  return focusableStages.indexOf(stage);
}

function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getChildMatchIds(matchId: MatchId): [MatchId, MatchId] | null {
  const slot = knockoutSlotMap[matchId];

  if (slot.sideA.kind !== "winner" || slot.sideB.kind !== "winner") {
    return null;
  }

  return [slot.sideA.matchId, slot.sideB.matchId];
}

function getNodeStatus(match: DerivedMatch, teamId?: TeamId): NodeStatus {
  if (!teamId) {
    return "pending";
  }

  if (match.winnerId === teamId) {
    return "winner";
  }

  if (match.sideA && match.sideB) {
    return "ready";
  }

  return "pending";
}

function BracketCountryNode({
  teamId,
  abbreviation,
  label,
  status,
  side,
  selected = false,
  disabled = false,
  onSelect,
}: BracketCountryNodeProps) {
  const flagAsset = teamId ? getTeamFlagAsset(teamId) : undefined;
  const dot = (
    <span
      aria-hidden
      className={cn(
        styles.statusDot,
        status === "winner" && styles.statusWinner,
        status === "ready" && styles.statusReady,
        status === "pending" && styles.statusPending,
      )}
    />
  );

  const content = (
    <>
      {side === "right" ? dot : null}
      {flagAsset ? (
        <span className={styles.countryFlag}>
          <Image
            src={flagAsset}
            alt={`Bandera de ${label}`}
            fill
            sizes="18px"
            className={styles.countryFlagAsset}
          />
        </span>
      ) : null}
      <span className={styles.countryCopy}>
        <strong className={styles.countryAbbreviation}>{abbreviation ?? "---"}</strong>
        <span className={styles.countryLabel}>{label}</span>
      </span>
      {side !== "right" ? dot : null}
    </>
  );

  const className = cn(
    styles.countryNode,
    side === "left" && styles.countryNodeLeft,
    side === "right" && styles.countryNodeRight,
    side === "center" && styles.countryNodeCenter,
    selected && styles.countryNodeSelected,
    status === "pending" && styles.countryNodePending,
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
    >
      {content}
    </button>
  );
}

function BracketMatchCard({
  match,
  side,
  onPickWinner,
  expandedMatchInfoId,
  onToggleInfo,
  featured = false,
  compact = false,
  readOnly = false,
}: BracketMatchCardProps) {
  const matchReady = Boolean(match.sideA && match.sideB);
  const isInfoExpanded = expandedMatchInfoId === match.matchId;
  const showChampionTrophy = featured && match.stage === "final" && Boolean(match.winnerId);

  return (
    <article
      className={cn(
        styles.matchCard,
        side === "left" && styles.matchCardLeft,
        side === "right" && styles.matchCardRight,
        side === "center" && styles.matchCardCenter,
        featured && styles.matchCardFeatured,
        compact && styles.matchCardCompact,
      )}
    >
      {showChampionTrophy ? (
        <div className={styles.championTrophyWrap} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/official/world-cup-trophy.png"
            alt=""
            className={styles.championTrophy}
          />
        </div>
      ) : null}

      <header
        className={cn(
          styles.matchHeader,
          side === "left" && styles.matchHeaderLeft,
          side === "right" && styles.matchHeaderRight,
          side === "center" && styles.matchHeaderCenter,
        )}
      >
        <div className={styles.matchHeaderTop}>
          <div className={styles.matchIdentity}>
            <p>{stageLabels[match.stage]}</p>
          </div>

          <button
            type="button"
            className={cn(
              styles.matchInfoButton,
              isInfoExpanded && styles.matchInfoButtonExpanded,
            )}
            onClick={() => onToggleInfo(match.matchId)}
            aria-expanded={isInfoExpanded}
            aria-label={`Ver más información del partido ${match.matchId}`}
          >
            i
          </button>
        </div>

        <div className={styles.matchSchedule}>
          <strong>{formatMatchDate(match.meta.date)}</strong>
        </div>
      </header>

      {isInfoExpanded ? (
        <div className={styles.matchDetails}>
          <div className={styles.matchDetailRow}>
            <span>Partido</span>
            <strong>{match.matchId}</strong>
          </div>
          <div className={styles.matchDetailRow}>
            <span>Ciudad</span>
            <strong>{match.meta.city}</strong>
          </div>
          <div className={styles.matchDetailRow}>
            <span>Estadio</span>
            <strong>{match.meta.venue}</strong>
          </div>
        </div>
      ) : null}

      <div className={styles.countryStack}>
        <BracketCountryNode
          teamId={match.sideA?.id}
          abbreviation={match.sideA?.code}
          label={match.sideA?.shortName ?? match.sideALabel}
          status={getNodeStatus(match, match.sideA?.id)}
          side={side}
          selected={match.winnerId === match.sideA?.id}
          disabled={!matchReady}
          onSelect={
            !readOnly && onPickWinner && match.sideA?.id
              ? () => onPickWinner(match.matchId, match.sideA!.id)
              : undefined
          }
        />
        <BracketCountryNode
          teamId={match.sideB?.id}
          abbreviation={match.sideB?.code}
          label={match.sideB?.shortName ?? match.sideBLabel}
          status={getNodeStatus(match, match.sideB?.id)}
          side={side}
          selected={match.winnerId === match.sideB?.id}
          disabled={!matchReady}
          onSelect={
            !readOnly && onPickWinner && match.sideB?.id
              ? () => onPickWinner(match.matchId, match.sideB!.id)
              : undefined
          }
        />
      </div>
    </article>
  );
}

function BracketMatchTree({
  matchId,
  side,
  matchesById,
  onPickWinner,
  expandedMatchInfoId,
  onToggleInfo,
  minVisibleStageIndex,
  readOnly = false,
}: BracketMatchTreeProps) {
  const match = matchesById[matchId];
  const childMatchIds = getChildMatchIds(matchId);
  const visibleChildMatchIds =
    childMatchIds?.filter(
      (childMatchId) => getStageIndex(matchesById[childMatchId].stage) >= minVisibleStageIndex,
    ) ?? null;

  if (!visibleChildMatchIds || visibleChildMatchIds.length === 0) {
    return (
      <div
        className={cn(
          styles.treeLeaf,
          side === "left" && styles.treeLeafLeft,
          side === "right" && styles.treeLeafRight,
        )}
        >
        <BracketMatchCard
          match={match}
          side={side}
          onPickWinner={onPickWinner}
          expandedMatchInfoId={expandedMatchInfoId}
          onToggleInfo={onToggleInfo}
          readOnly={readOnly}
        />
      </div>
    );
  }

  const children = (
    <div
      className={cn(
        styles.treeChildren,
        side === "left" && styles.treeChildrenLeft,
        side === "right" && styles.treeChildrenRight,
      )}
    >
      {visibleChildMatchIds.map((childMatchId) => (
        <div
          key={childMatchId}
          className={cn(
            styles.treeChild,
            side === "left" && styles.treeChildLeft,
            side === "right" && styles.treeChildRight,
          )}
        >
          <BracketMatchTree
            matchId={childMatchId}
            side={side}
            matchesById={matchesById}
            onPickWinner={onPickWinner}
            expandedMatchInfoId={expandedMatchInfoId}
            onToggleInfo={onToggleInfo}
            minVisibleStageIndex={minVisibleStageIndex}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        styles.treeNode,
        side === "left" && styles.treeNodeLeft,
        side === "right" && styles.treeNodeRight,
      )}
    >
      {side === "left" ? (
        <>
          {children}
          <div className={styles.treeConnector} aria-hidden />
          <div className={styles.treeMatch}>
            <BracketMatchCard
              match={match}
              side={side}
              onPickWinner={onPickWinner}
              expandedMatchInfoId={expandedMatchInfoId}
              onToggleInfo={onToggleInfo}
              readOnly={readOnly}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.treeMatch}>
            <BracketMatchCard
              match={match}
              side={side}
              onPickWinner={onPickWinner}
              expandedMatchInfoId={expandedMatchInfoId}
              onToggleInfo={onToggleInfo}
              readOnly={readOnly}
            />
          </div>
          <div className={styles.treeConnector} aria-hidden />
          {children}
        </>
      )}
    </div>
  );
}

export function TournamentBracket({
  matchesById,
  onPickWinner,
  readOnly = false,
}: TournamentBracketProps) {
  const [expandedMatchInfoId, setExpandedMatchInfoId] = useState<MatchId | null>(null);
  const [visibleFromStage, setVisibleFromStage] = useState<StageId>("roundOf32");
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({
    scale: 1,
    width: 0,
    height: 0,
  });
  const isStageFocused = visibleFromStage !== "roundOf32";
  const minVisibleStageIndex = getStageIndex(visibleFromStage);
  const visibleStages = focusableStages.slice(minVisibleStageIndex);
  const sideGuideStages = visibleStages.filter((stage) => stage !== "final");
  const showBranchColumns = visibleFromStage !== "final";
  const stageGuideColumns = sideGuideStages.length * 2 + 1;
  const toggleStageVisibility = (stage: StageId) => {
    setVisibleFromStage((current) =>
      current === stage && stage !== "roundOf32" ? "roundOf32" : stage,
    );
  };
  const stageGuideStyle = {
    "--stage-guide-columns": String(stageGuideColumns),
  } as CSSProperties;
  const scaleFrameStyle =
    fit.width > 0 && fit.height > 0
      ? ({
          inlineSize: `${fit.width * fit.scale}px`,
          blockSize: `${fit.height * fit.scale}px`,
        } as CSSProperties)
      : undefined;
  const contentStyle =
    fit.scale < 1
      ? ({
          transform: `scale(${fit.scale})`,
        } as CSSProperties)
      : undefined;

  useEffect(() => {
    const viewportElement = viewportRef.current;
    const contentElement = contentRef.current;

    if (!viewportElement || !contentElement) {
      return;
    }

    const updateFit = () => {
      const naturalWidth = contentElement.scrollWidth;
      const naturalHeight = contentElement.scrollHeight;
      const viewportWidth = viewportElement.clientWidth;
      const isDesktop = window.matchMedia("(min-width: 900px)").matches;
      const nextScale =
        isDesktop && naturalWidth > viewportWidth
          ? Math.max(0.72, Math.min(1, (viewportWidth - 12) / naturalWidth))
          : 1;

      setFit({
        scale: nextScale,
        width: naturalWidth,
        height: naturalHeight,
      });
    };

    updateFit();

    const resizeObserver = new ResizeObserver(updateFit);
    resizeObserver.observe(viewportElement);
    resizeObserver.observe(contentElement);
    window.addEventListener("resize", updateFit);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [minVisibleStageIndex, showBranchColumns]);

  return (
    <div
      className={cn(
        styles.bracketShell,
        isStageFocused && styles.bracketShellFocused,
      )}
    >
      <div className={styles.bracketViewport} ref={viewportRef}>
        <div className={styles.bracketScaleFrame} style={scaleFrameStyle}>
          <div className={styles.bracketContent} ref={contentRef} style={contentStyle}>
          <div className={styles.stageGuide} style={stageGuideStyle}>
            {sideGuideStages.map((stage, index) => (
              <button
                key={`left-${stage}`}
                type="button"
                className={cn(
                  styles.stagePill,
                  styles.stagePillInteractive,
                  visibleFromStage === stage && styles.stagePillActive,
                )}
                style={{ gridColumn: index + 1 } as CSSProperties}
                onClick={() => toggleStageVisibility(stage)}
              >
                {stageLabels[stage]}
              </button>
            ))}

            <button
              type="button"
              className={cn(
                styles.stagePill,
                styles.stagePillInteractive,
                visibleFromStage === "final" && styles.stagePillActive,
              )}
              style={{ gridColumn: sideGuideStages.length + 1 } as CSSProperties}
              onClick={() => toggleStageVisibility("final")}
            >
              {stageLabels.final}
            </button>

            {[...sideGuideStages].reverse().map((stage, index) => (
              <button
                key={`right-${stage}`}
                type="button"
                className={cn(
                  styles.stagePill,
                  styles.stagePillInteractive,
                  visibleFromStage === stage && styles.stagePillActive,
                )}
                style={
                  {
                    gridColumn: sideGuideStages.length + 2 + index,
                  } as CSSProperties
                }
                onClick={() => toggleStageVisibility(stage)}
              >
                {stageLabels[stage]}
              </button>
            ))}
          </div>

          <div className={styles.bracketCanvas}>
            {showBranchColumns ? (
              <div className={cn(styles.branchColumn, styles.branchColumnLeft)}>
                <BracketMatchTree
                  matchId="M101"
                  side="left"
                  matchesById={matchesById}
                  onPickWinner={onPickWinner}
                  expandedMatchInfoId={expandedMatchInfoId}
                  onToggleInfo={(matchId) =>
                    setExpandedMatchInfoId((current) => (current === matchId ? null : matchId))
                  }
                  minVisibleStageIndex={minVisibleStageIndex}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <div className={styles.branchSpacer} aria-hidden />
            )}

            <div className={styles.finalColumn}>
              <div className={styles.finalRow}>
                {showBranchColumns ? <span className={styles.finalConnector} aria-hidden /> : null}
                <BracketMatchCard
                  match={matchesById.M104}
                  side="center"
                  onPickWinner={onPickWinner}
                  expandedMatchInfoId={expandedMatchInfoId}
                  onToggleInfo={(matchId) =>
                    setExpandedMatchInfoId((current) => (current === matchId ? null : matchId))
                  }
                  featured
                  readOnly={readOnly}
                />
                {showBranchColumns ? <span className={styles.finalConnector} aria-hidden /> : null}
              </div>

              <div className={styles.bronzeColumn}>
                <BracketMatchCard
                  match={matchesById.M103}
                  side="center"
                  onPickWinner={onPickWinner}
                  expandedMatchInfoId={expandedMatchInfoId}
                  onToggleInfo={(matchId) =>
                    setExpandedMatchInfoId((current) => (current === matchId ? null : matchId))
                  }
                  compact
                  readOnly={readOnly}
                />
              </div>
            </div>

            {showBranchColumns ? (
              <div className={cn(styles.branchColumn, styles.branchColumnRight)}>
                <BracketMatchTree
                  matchId="M102"
                  side="right"
                  matchesById={matchesById}
                  onPickWinner={onPickWinner}
                  expandedMatchInfoId={expandedMatchInfoId}
                  onToggleInfo={(matchId) =>
                    setExpandedMatchInfoId((current) => (current === matchId ? null : matchId))
                  }
                  minVisibleStageIndex={minVisibleStageIndex}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <div className={styles.branchSpacer} aria-hidden />
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
