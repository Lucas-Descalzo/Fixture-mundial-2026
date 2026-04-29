import {
  groupMap,
  groups,
  knockoutMatchOrder,
  knockoutSlots,
  stageLabels,
  teamMap,
  thirdPlaceFamilies,
} from "@/data/world-cup-2026";
import {
  createThirdPlaceCombinationKey,
  thirdPlaceCombinationMatrix,
} from "@/data/third-place-combinations";
import {
  GROUP_IDS,
  THIRD_PLACE_MATCH_IDS,
  type DerivedMatch,
  type DerivedTeam,
  type FixtureState,
  type GroupId,
  type MatchId,
  type ParticipantRef,
  type TeamId,
  type ThirdPlaceMatchId,
} from "@/lib/world-cup-types";

export const FIXTURE_STATE_VERSION = 1;

const placementLabels = {
  1: "1°",
  2: "2°",
  3: "3°",
  4: "4°",
} as const;

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function createInitialFixtureState(): FixtureState {
  return {
    version: FIXTURE_STATE_VERSION,
    groupOrders: Object.fromEntries(
      groups.map((group) => [group.id, [...group.teams]]),
    ) as FixtureState["groupOrders"],
    qualifiedThirdPlaces: [],
    thirdPlaceAssignments: {},
    knockoutWinners: {},
  };
}

export function sanitizeGroupOrders(
  source: Partial<Record<GroupId, TeamId[]>> | undefined,
): FixtureState["groupOrders"] {
  return Object.fromEntries(
    groups.map((group) => {
      const incoming = source?.[group.id] ?? [];
      const incomingValid = incoming.filter((teamId) => group.teams.includes(teamId));
      const deduped = unique(incomingValid);
      const missing = group.teams.filter((teamId) => !deduped.includes(teamId));

      return [group.id, [...deduped, ...missing]];
    }),
  ) as FixtureState["groupOrders"];
}

export function getThirdPlaceCandidates(groupOrders: FixtureState["groupOrders"]) {
  return GROUP_IDS.map((groupId) => {
    const teamId = groupOrders[groupId][2];
    return teamMap[teamId];
  });
}

export function getGroupPlacements(groupOrders: FixtureState["groupOrders"], groupId: GroupId) {
  return groupOrders[groupId].map((teamId) => teamMap[teamId]);
}

export function suggestThirdAssignments(
  qualifiedThirdPlaces: TeamId[],
): Partial<Record<ThirdPlaceMatchId, TeamId>> {
  if (qualifiedThirdPlaces.length !== THIRD_PLACE_MATCH_IDS.length) {
    return {};
  }

  const teamsByGroup = Object.fromEntries(
    qualifiedThirdPlaces.map((teamId) => [teamMap[teamId].group, teamId]),
  ) as Partial<Record<GroupId, TeamId>>;
  const combinationKey = createThirdPlaceCombinationKey(
    qualifiedThirdPlaces.map((teamId) => teamMap[teamId].group),
  );
  const officialAssignment = thirdPlaceCombinationMatrix[combinationKey];
  const assignment: Partial<Record<ThirdPlaceMatchId, TeamId>> = {};

  if (!officialAssignment) {
    return {};
  }

  for (const matchId of THIRD_PLACE_MATCH_IDS) {
    const assignedGroup = officialAssignment[matchId];
    const teamId = teamsByGroup[assignedGroup];

    if (!teamId || !thirdPlaceFamilies[matchId].includes(assignedGroup)) {
      return {};
    }

    assignment[matchId] = teamId;
  }

  return assignment;
}

export function sanitizeQualifiedThirdPlaces(
  incoming: TeamId[] | undefined,
  thirdCandidates: TeamId[],
) {
  const thirdCandidateSet = new Set(thirdCandidates);
  const filtered = (incoming ?? []).filter((teamId) => thirdCandidateSet.has(teamId));

  return unique(filtered).slice(0, 8);
}

export function sanitizeThirdAssignments(
  _incoming: Partial<Record<ThirdPlaceMatchId, TeamId>> | undefined,
  qualifiedThirdPlaces: TeamId[],
) {
  if (qualifiedThirdPlaces.length !== THIRD_PLACE_MATCH_IDS.length) {
    return {};
  }

  return suggestThirdAssignments(qualifiedThirdPlaces);
}

function formatPlacementRef(group: GroupId, place: 1 | 2) {
  return `${placementLabels[place]} ${group}`;
}

function formatThirdRef(allowedGroups: GroupId[]) {
  return `3° ${allowedGroups.join("")}`;
}

function formatRefLabel(ref: ParticipantRef) {
  switch (ref.kind) {
    case "placement":
      return formatPlacementRef(ref.group, ref.place);
    case "third":
      return formatThirdRef(ref.allowedGroups);
    case "winner":
      return `Ganador ${ref.matchId}`;
    case "loser":
      return `Perdedor ${ref.matchId}`;
    default:
      return "";
  }
}

function getTeamByPlacement(
  ref: Extract<ParticipantRef, { kind: "placement" }>,
  groupOrders: FixtureState["groupOrders"],
) {
  const teamId = groupOrders[ref.group][ref.place - 1];
  return teamMap[teamId] ?? null;
}

function getTeamByThird(
  matchId: ThirdPlaceMatchId,
  thirdPlaceAssignments: Partial<Record<ThirdPlaceMatchId, TeamId>>,
) {
  const teamId = thirdPlaceAssignments[matchId];
  return teamId ? teamMap[teamId] : null;
}

function asDerivedTeam(teamId: TeamId | undefined): DerivedTeam | null {
  if (!teamId) {
    return null;
  }

  const team = teamMap[teamId];
  if (!team) {
    return null;
  }

  return { ...team };
}

export function deriveMatches(
  state: FixtureState,
  keepValidWinnersOnly = false,
) {
  const matchesById = {} as Record<MatchId, DerivedMatch>;
  const validWinners: Partial<Record<MatchId, TeamId>> = {};

  for (const matchId of knockoutMatchOrder) {
    const slot = knockoutSlots.find((entry) => entry.matchId === matchId);

    if (!slot) {
      continue;
    }

    const resolveRef = (ref: ParticipantRef): DerivedTeam | null => {
      switch (ref.kind) {
        case "placement":
          return getTeamByPlacement(ref, state.groupOrders);
        case "third":
          return getTeamByThird(matchId as ThirdPlaceMatchId, state.thirdPlaceAssignments);
        case "winner":
          return asDerivedTeam(validWinners[ref.matchId]);
        case "loser": {
          const previousMatch = matchesById[ref.matchId];
          return asDerivedTeam(previousMatch?.loserId);
        }
        default:
          return null;
      }
    };

    const sideA = resolveRef(slot.sideA);
    const sideB = resolveRef(slot.sideB);

    let winnerId = state.knockoutWinners[matchId];
    if (winnerId && winnerId !== sideA?.id && winnerId !== sideB?.id) {
      winnerId = undefined;
    }

    if (winnerId) {
      validWinners[matchId] = winnerId;
    } else if (keepValidWinnersOnly) {
      delete validWinners[matchId];
    }

    let loserId: TeamId | undefined;
    if (winnerId && sideA && sideB) {
      loserId = sideA.id === winnerId ? sideB.id : sideA.id;
    }

    matchesById[matchId] = {
      matchId,
      stage: slot.stage,
      meta: slot.meta,
      sideA,
      sideB,
      sideALabel: sideA?.shortName ?? formatRefLabel(slot.sideA),
      sideBLabel: sideB?.shortName ?? formatRefLabel(slot.sideB),
      winnerId,
      loserId,
    };
  }

  return { matchesById, validWinners };
}

export function normalizeFixtureState(source: Partial<FixtureState> | FixtureState) {
  const initial = createInitialFixtureState();
  const groupOrders = sanitizeGroupOrders(source.groupOrders);
  const thirdCandidates = getThirdPlaceCandidates(groupOrders).map((team) => team.id);
  const qualifiedThirdPlaces = sanitizeQualifiedThirdPlaces(
    source.qualifiedThirdPlaces,
    thirdCandidates,
  );
  const thirdPlaceAssignments = sanitizeThirdAssignments(
    source.thirdPlaceAssignments,
    qualifiedThirdPlaces,
  );

  const baseState: FixtureState = {
    version: FIXTURE_STATE_VERSION,
    groupOrders,
    qualifiedThirdPlaces,
    thirdPlaceAssignments,
    knockoutWinners: source.knockoutWinners ?? initial.knockoutWinners,
  };

  const { validWinners } = deriveMatches(baseState, true);

  return {
    ...baseState,
    knockoutWinners: validWinners,
  };
}

export function getChampion(matchMap: Record<MatchId, DerivedMatch>) {
  const final = matchMap.M104;
  if (!final?.winnerId) {
    return null;
  }

  return teamMap[final.winnerId];
}

export function getThirdPlaceSlotOptions(qualifiedThirdPlaces: TeamId[]) {
  return Object.fromEntries(
    THIRD_PLACE_MATCH_IDS.map((matchId) => [
      matchId,
      qualifiedThirdPlaces
        .map((teamId) => teamMap[teamId])
        .filter((team) => thirdPlaceFamilies[matchId].includes(team.group)),
    ]),
  ) as Record<ThirdPlaceMatchId, ReturnType<typeof getThirdPlaceCandidates>>;
}

export function getGroupColor(groupId: GroupId) {
  return groupMap[groupId].color;
}

export function getStageColumns(matchMap: Record<MatchId, DerivedMatch>) {
  return [
    {
      id: "roundOf32",
      label: stageLabels.roundOf32,
      matches: [
        matchMap.M73,
        matchMap.M74,
        matchMap.M75,
        matchMap.M76,
        matchMap.M77,
        matchMap.M78,
        matchMap.M79,
        matchMap.M80,
        matchMap.M81,
        matchMap.M82,
        matchMap.M83,
        matchMap.M84,
        matchMap.M85,
        matchMap.M86,
        matchMap.M87,
        matchMap.M88,
      ],
    },
    {
      id: "roundOf16",
      label: stageLabels.roundOf16,
      matches: [
        matchMap.M89,
        matchMap.M90,
        matchMap.M91,
        matchMap.M92,
        matchMap.M93,
        matchMap.M94,
        matchMap.M95,
        matchMap.M96,
      ],
    },
    {
      id: "quarterFinal",
      label: stageLabels.quarterFinal,
      matches: [matchMap.M97, matchMap.M98, matchMap.M99, matchMap.M100],
    },
    {
      id: "semiFinal",
      label: stageLabels.semiFinal,
      matches: [matchMap.M101, matchMap.M102],
    },
    {
      id: "medal",
      label: "Medallas",
      matches: [matchMap.M103, matchMap.M104],
    },
  ];
}
