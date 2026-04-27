import { knockoutMatchOrder } from "@/data/world-cup-2026";
import { deriveMatches, normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState, MatchId, TeamId } from "@/lib/world-cup-types";

const ROUND_OF_32_MATCHES = knockoutMatchOrder.slice(0, 16);
const ROUND_OF_16_MATCHES = knockoutMatchOrder.slice(16, 24);
const QUARTER_FINAL_MATCHES = knockoutMatchOrder.slice(24, 28);

export interface FixtureScoreBreakdown {
  groupClassificationPoints: number;
  groupExactPositionPoints: number;
  roundOf32Points: number;
  roundOf16Points: number;
  quarterFinalPoints: number;
  semiFinalPoints: number;
  finalistPoints: number;
  exactFinalBonus: number;
  championBonus: number;
  thirdPlaceBonus: number;
  total: number;
  scoredUnits: number;
  pendingUnits: number;
}

function uniqueTeamIds(teamIds: Array<TeamId | undefined>) {
  return [...new Set(teamIds.filter(Boolean) as TeamId[])];
}

function countSetHits(predicted: TeamId[], official: TeamId[]) {
  const officialSet = new Set(official);
  return predicted.filter((teamId) => officialSet.has(teamId)).length;
}

function getQualifiedTeamIds(state: FixtureState) {
  return uniqueTeamIds([
    ...Object.values(state.groupOrders).flatMap((groupOrder) => groupOrder.slice(0, 2)),
    ...state.qualifiedThirdPlaces,
  ]);
}

function hasOfficialRoundOf32(state: FixtureState) {
  return (
    state.qualifiedThirdPlaces.length === 8 &&
    Object.keys(state.thirdPlaceAssignments).length === 8
  );
}

function getParticipantIdsByMatchIds(
  matchesById: ReturnType<typeof deriveMatches>["matchesById"],
  matchIds: MatchId[],
) {
  return uniqueTeamIds(
    matchIds.flatMap((matchId) => [
      matchesById[matchId]?.sideA?.id,
      matchesById[matchId]?.sideB?.id,
    ]),
  );
}

function getWinnerIdsByMatchIds(
  matchesById: ReturnType<typeof deriveMatches>["matchesById"],
  matchIds: MatchId[],
) {
  return uniqueTeamIds(matchIds.map((matchId) => matchesById[matchId]?.winnerId));
}

function getGroupPhasePoints(predictionState: FixtureState, officialState: FixtureState) {
  if (!hasOfficialRoundOf32(officialState)) {
    return {
      groupClassificationPoints: 0,
      groupExactPositionPoints: 0,
      scoredTeams: 0,
    };
  }

  const predictedQualified = getQualifiedTeamIds(predictionState);
  const officialQualified = getQualifiedTeamIds(officialState);
  const officialQualifiedSet = new Set(officialQualified);
  let groupClassificationPoints = 0;
  let groupExactPositionPoints = 0;

  for (const teamId of predictedQualified) {
    if (!officialQualifiedSet.has(teamId)) {
      continue;
    }

    groupClassificationPoints += 1;
  }

  for (const groupId of Object.keys(predictionState.groupOrders) as Array<
    keyof FixtureState["groupOrders"]
  >) {
    const predictionOrder = predictionState.groupOrders[groupId];
    const officialOrder = officialState.groupOrders[groupId];

    for (let index = 0; index < 3; index += 1) {
      const predictedTeamId = predictionOrder[index];

      if (
        predictedTeamId &&
        predictedTeamId === officialOrder[index] &&
        officialQualifiedSet.has(predictedTeamId)
      ) {
        groupExactPositionPoints += 2;
      }
    }
  }

  return {
    groupClassificationPoints,
    groupExactPositionPoints,
    scoredTeams: officialQualified.length,
  };
}

function scoreSurvivalRound(
  predictedTeams: TeamId[],
  officialTeams: TeamId[],
  pointsPerTeam: number,
) {
  if (officialTeams.length === 0) {
    return 0;
  }

  return countSetHits(predictedTeams, officialTeams) * pointsPerTeam;
}

function countScoredUnits(officialState: FixtureState) {
  let scoredUnits = 0;

  if (hasOfficialRoundOf32(officialState)) {
    scoredUnits += 48;
  }

  scoredUnits += Object.keys(officialState.knockoutWinners).length;

  return scoredUnits;
}

export function scoreFixture(
  predictionSource: Partial<FixtureState> | FixtureState,
  officialSource: Partial<FixtureState> | FixtureState,
): FixtureScoreBreakdown {
  const predictionState = normalizeFixtureState(predictionSource);
  const officialState = normalizeFixtureState(officialSource);
  const predictionMatches = deriveMatches(predictionState).matchesById;
  const officialMatches = deriveMatches(officialState).matchesById;
  const groupPoints = getGroupPhasePoints(predictionState, officialState);

  const predictedRoundOf32 = hasOfficialRoundOf32(officialState)
    ? getQualifiedTeamIds(predictionState)
    : [];
  const officialRoundOf32 = hasOfficialRoundOf32(officialState)
    ? getQualifiedTeamIds(officialState)
    : [];
  const predictedRoundOf16 = getWinnerIdsByMatchIds(predictionMatches, ROUND_OF_32_MATCHES);
  const officialRoundOf16 = getWinnerIdsByMatchIds(officialMatches, ROUND_OF_32_MATCHES);
  const predictedQuarterFinalists = getWinnerIdsByMatchIds(
    predictionMatches,
    ROUND_OF_16_MATCHES,
  );
  const officialQuarterFinalists = getWinnerIdsByMatchIds(officialMatches, ROUND_OF_16_MATCHES);
  const predictedSemiFinalists = getWinnerIdsByMatchIds(predictionMatches, QUARTER_FINAL_MATCHES);
  const officialSemiFinalists = getWinnerIdsByMatchIds(officialMatches, QUARTER_FINAL_MATCHES);
  const predictedFinalists = getParticipantIdsByMatchIds(predictionMatches, ["M104"]);
  const officialFinalists = getParticipantIdsByMatchIds(officialMatches, ["M104"]);

  const roundOf32Points = scoreSurvivalRound(predictedRoundOf32, officialRoundOf32, 1);
  const roundOf16Points = scoreSurvivalRound(predictedRoundOf16, officialRoundOf16, 2);
  const quarterFinalPoints = scoreSurvivalRound(
    predictedQuarterFinalists,
    officialQuarterFinalists,
    3,
  );
  const semiFinalPoints = scoreSurvivalRound(predictedSemiFinalists, officialSemiFinalists, 5);
  const finalistPoints = scoreSurvivalRound(predictedFinalists, officialFinalists, 7);
  const exactFinalBonus =
    officialFinalists.length === 2 && countSetHits(predictedFinalists, officialFinalists) === 2
      ? 3
      : 0;
  const championBonus =
    officialMatches.M104.winnerId &&
    predictionMatches.M104.winnerId === officialMatches.M104.winnerId
      ? 10
      : 0;
  const thirdPlaceBonus =
    officialMatches.M103.winnerId &&
    predictionMatches.M103.winnerId === officialMatches.M103.winnerId
      ? 3
      : 0;

  const total =
    groupPoints.groupClassificationPoints +
    groupPoints.groupExactPositionPoints +
    roundOf32Points +
    roundOf16Points +
    quarterFinalPoints +
    semiFinalPoints +
    finalistPoints +
    exactFinalBonus +
    championBonus +
    thirdPlaceBonus;

  const scoredUnits = countScoredUnits(officialState);

  return {
    groupClassificationPoints: groupPoints.groupClassificationPoints,
    groupExactPositionPoints: groupPoints.groupExactPositionPoints,
    roundOf32Points,
    roundOf16Points,
    quarterFinalPoints,
    semiFinalPoints,
    finalistPoints,
    exactFinalBonus,
    championBonus,
    thirdPlaceBonus,
    total,
    scoredUnits,
    pendingUnits: Math.max(0, 80 - scoredUnits),
  };
}
