import { describe, expect, it } from "vitest";

import { knockoutMatchOrder } from "@/data/world-cup-2026";
import {
  createInitialFixtureState,
  deriveMatches,
  getThirdPlaceCandidates,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import { hashEditKey, verifyEditKey } from "@/lib/group-auth";
import {
  createGroupSlug,
  getRemainingKnockoutMatchesCount,
  parseArgentinaDateTimeToUtc,
} from "@/lib/group-utils";

describe("group helpers", () => {
  it("creates readable group slugs with a fixed suffix", () => {
    expect(createGroupSlug("Hueco de Amigos", "a7f2")).toBe("hueco-de-amigos-a7f2");
  });

  it("parses Argentina datetime-local values into UTC", () => {
    expect(parseArgentinaDateTimeToUtc("2026-06-01T21:30")).toBe(
      "2026-06-02T00:30:00.000Z",
    );
  });

  it("counts all knockout matches as pending on an empty fixture", () => {
    expect(getRemainingKnockoutMatchesCount(createInitialFixtureState())).toBe(32);
  });

  it("detects a complete fixture once every knockout winner is selected", () => {
    const baseState = normalizeFixtureState({
      ...createInitialFixtureState(),
      qualifiedThirdPlaces: getThirdPlaceCandidates(createInitialFixtureState().groupOrders)
        .map((team) => team.id)
        .slice(0, 8),
    });

    const winners = {} as typeof baseState.knockoutWinners;

    for (const matchId of knockoutMatchOrder) {
      const nextMatches = deriveMatches({
        ...baseState,
        knockoutWinners: winners,
      }).matchesById;
      const match = nextMatches[matchId];
      const winnerId = match.sideA?.id ?? match.sideB?.id;

      if (winnerId) {
        winners[matchId] = winnerId;
      }
    }

    const completedState = normalizeFixtureState({
      ...baseState,
      knockoutWinners: winners,
    });

    expect(getRemainingKnockoutMatchesCount(completedState)).toBe(0);
  });
});

describe("group edit key hashing", () => {
  it("hashes and verifies an edit key", () => {
    const { hash, salt } = hashEditKey("mi-clave-secreta");

    expect(verifyEditKey("mi-clave-secreta", salt, hash)).toBe(true);
    expect(verifyEditKey("otra-clave", salt, hash)).toBe(false);
  });
});
