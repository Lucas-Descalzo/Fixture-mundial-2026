import { describe, expect, it } from "vitest";

import { knockoutMeta, teamMap, thirdPlaceFamilies } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getThirdPlaceCandidates,
  normalizeFixtureState,
  suggestThirdAssignments,
} from "@/lib/world-cup-fixture";
import { decodeFixtureState, encodeFixtureState } from "@/lib/world-cup-state";

describe("world cup fixture engine", () => {
  it("suggests eight unique third-place assignments compatible with official slot families", () => {
    const initialState = createInitialFixtureState();
    const selectedThirds = getThirdPlaceCandidates(initialState.groupOrders)
      .map((team) => team.id)
      .slice(0, 8);

    const assignments = suggestThirdAssignments(selectedThirds);
    const assignedTeams = Object.values(assignments);

    expect(Object.keys(assignments)).toHaveLength(8);
    expect(new Set(assignedTeams).size).toBe(8);

    for (const [matchId, teamId] of Object.entries(assignments)) {
      expect(thirdPlaceFamilies[matchId as keyof typeof thirdPlaceFamilies]).toContain(
        teamMap[teamId].group,
      );
    }
  });

  it("removes third-place selections that stop being third after a group reorder", () => {
    const initialState = createInitialFixtureState();
    const formerThird = initialState.groupOrders.A[2];

    const loadedState = normalizeFixtureState({
      ...initialState,
      qualifiedThirdPlaces: [formerThird],
    });

    const nextGroupOrder = [...initialState.groupOrders.A];
    [nextGroupOrder[2], nextGroupOrder[3]] = [nextGroupOrder[3], nextGroupOrder[2]];

    const normalized = normalizeFixtureState({
      ...loadedState,
      groupOrders: {
        ...loadedState.groupOrders,
        A: nextGroupOrder,
      },
    });

    expect(normalized.qualifiedThirdPlaces).not.toContain(formerThird);
  });

  it("invalidates downstream winners when a source participant changes", () => {
    const initialState = createInitialFixtureState();
    const withWinner = normalizeFixtureState({
      ...initialState,
      knockoutWinners: {
        M73: initialState.groupOrders.A[1],
      },
    });

    const changedA = [...withWinner.groupOrders.A];
    [changedA[1], changedA[2]] = [changedA[2], changedA[1]];

    const normalized = normalizeFixtureState({
      ...withWinner,
      groupOrders: {
        ...withWinner.groupOrders,
        A: changedA,
      },
    });

    expect(normalized.knockoutWinners.M73).toBeUndefined();
  });

  it("round-trips the share payload safely", () => {
    const state = normalizeFixtureState({
      ...createInitialFixtureState(),
      qualifiedThirdPlaces: getThirdPlaceCandidates(createInitialFixtureState().groupOrders)
        .map((team) => team.id)
        .slice(0, 8),
    });

    const encoded = encodeFixtureState(state);
    const decoded = decodeFixtureState(encoded);

    expect(decoded).toEqual(state);
  });

  it("keeps official metadata for the final", () => {
    expect(knockoutMeta.M104.date).toBe("2026-07-19");
    expect(knockoutMeta.M104.venue).toContain("New York New Jersey");
  });

  it("derives placeholder labels before the bracket is completed", () => {
    const matches = deriveMatches(createInitialFixtureState()).matchesById;

    expect(matches.M89.sideALabel).toContain("Ganador");
    expect(matches.M103.sideALabel).toContain("Perdedor");
  });
});
