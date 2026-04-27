import { describe, expect, it } from "vitest";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getThirdPlaceCandidates,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import { scoreFixture } from "@/lib/scoring";
import type { FixtureState } from "@/lib/world-cup-types";

function createReadyBaseState() {
  const initial = createInitialFixtureState();

  return normalizeFixtureState({
    ...initial,
    qualifiedThirdPlaces: getThirdPlaceCandidates(initial.groupOrders)
      .map((team) => team.id)
      .slice(0, 8),
  });
}

function completeWithFirstAvailableWinner(source: FixtureState) {
  const winners: FixtureState["knockoutWinners"] = {};

  for (const matchId of knockoutMatchOrder) {
    const match = deriveMatches({ ...source, knockoutWinners: winners }).matchesById[matchId];
    const winnerId = match.sideA?.id ?? match.sideB?.id;

    if (winnerId) {
      winners[matchId] = winnerId;
    }
  }

  return normalizeFixtureState({
    ...source,
    knockoutWinners: winners,
  });
}

describe("fixture scoring", () => {
  it("scores group classification and exact positions when the official round of 32 is known", () => {
    const baseState = createReadyBaseState();
    const score = scoreFixture(baseState, baseState);

    expect(score.groupClassificationPoints).toBe(32);
    expect(score.groupExactPositionPoints).toBe(64);
    expect(score.roundOf32Points).toBe(32);
    expect(score.total).toBe(128);
    expect(score.scoredUnits).toBe(48);
  });

  it("scores knockout survival by round sets, not exact match slots", () => {
    const baseState = createReadyBaseState();
    const firstMatch = deriveMatches(baseState).matchesById.M73;
    const officialState = normalizeFixtureState({
      ...baseState,
      knockoutWinners: { M73: firstMatch.sideA!.id },
    });

    const score = scoreFixture(officialState, officialState);

    expect(score.roundOf16Points).toBe(2);
    expect(score.total).toBe(130);
    expect(score.scoredUnits).toBe(49);
    expect(score.pendingUnits).toBe(31);
  });

  it("adds exact final, champion and third-place bonuses when the full fixture matches", () => {
    const completedState = completeWithFirstAvailableWinner(createReadyBaseState());
    const score = scoreFixture(completedState, completedState);

    expect(score.roundOf16Points).toBe(32);
    expect(score.quarterFinalPoints).toBe(24);
    expect(score.semiFinalPoints).toBe(20);
    expect(score.finalistPoints).toBe(14);
    expect(score.exactFinalBonus).toBe(3);
    expect(score.championBonus).toBe(10);
    expect(score.thirdPlaceBonus).toBe(3);
    expect(score.total).toBe(234);
    expect(score.pendingUnits).toBe(0);
  });
});
