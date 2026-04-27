import type { FixtureState } from "@/lib/world-cup-types";

export interface GroupRecord {
  id: string;
  slug: string;
  name: string;
  deadlineAtUtc: string;
  scoringEnabled: boolean;
  isPublicPool: boolean;
  createdAt: string;
}

export interface EntryRecord {
  id: string;
  groupId: string;
  firstName: string;
  lastName: string;
  fullNameNormalized: string;
  editKeyHash: string;
  editKeySalt: string;
  fixtureState: FixtureState;
  submittedAt: string;
  updatedAt: string;
  failedResumeAttempts: number;
  resumeLockedUntilUtc: string | null;
}

export interface GroupParticipant {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  submittedAt: string;
  updatedAt: string;
  fixtureState?: FixtureState;
}

export interface RankingRow {
  entryId: string;
  displayName: string;
  updatedAt: string;
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

export interface GroupPageData {
  group: GroupRecord;
  isClosed: boolean;
  participants: GroupParticipant[];
  ranking: RankingRow[];
  hasOfficialResults: boolean;
}

export interface CreateGroupInput {
  name: string;
  deadlineLocal: string;
  scoringEnabled?: boolean;
}

export interface SaveEntryInput {
  groupSlug: string;
  firstName: string;
  lastName: string;
  editKey: string;
  fixtureState: FixtureState;
}

export interface ResumeEntryInput {
  groupSlug: string;
  firstName: string;
  lastName: string;
  editKey: string;
}

export interface CreateGroupResult {
  ok: boolean;
  group?: GroupRecord;
  errorCode?:
    | "DATABASE_UNAVAILABLE"
    | "INVALID_NAME"
    | "INVALID_DEADLINE"
    | "PAST_DEADLINE"
    | "CREATE_FAILED";
  message?: string;
}

export interface SaveEntryResult {
  saved: boolean;
  remainingMatches: number;
  isUpdate: boolean;
  deadlineReached: boolean;
  lockedUntilUtc?: string | null;
  errorCode?:
    | "DATABASE_UNAVAILABLE"
    | "GROUP_NOT_FOUND"
    | "INVALID_IDENTITY"
    | "INVALID_EDIT_KEY"
    | "GROUP_CLOSED"
    | "INCOMPLETE_FIXTURE"
    | "NAME_TAKEN"
    | "LOCKED"
    | "SAVE_FAILED";
  message?: string;
}

export interface ResumeEntryResult {
  ok: boolean;
  fixtureState?: FixtureState;
  deadlineReached?: boolean;
  lockedUntilUtc?: string | null;
  errorCode?:
    | "DATABASE_UNAVAILABLE"
    | "GROUP_NOT_FOUND"
    | "INVALID_IDENTITY"
    | "INVALID_EDIT_KEY"
    | "INVALID_CREDENTIALS"
    | "LOCKED"
    | "GROUP_CLOSED";
  message?: string;
}
