export const GROUP_IDS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export type GroupId = (typeof GROUP_IDS)[number];
export type TeamId = string;
export type MatchId =
  | "M73"
  | "M74"
  | "M75"
  | "M76"
  | "M77"
  | "M78"
  | "M79"
  | "M80"
  | "M81"
  | "M82"
  | "M83"
  | "M84"
  | "M85"
  | "M86"
  | "M87"
  | "M88"
  | "M89"
  | "M90"
  | "M91"
  | "M92"
  | "M93"
  | "M94"
  | "M95"
  | "M96"
  | "M97"
  | "M98"
  | "M99"
  | "M100"
  | "M101"
  | "M102"
  | "M103"
  | "M104";

export const THIRD_PLACE_MATCH_IDS = [
  "M74",
  "M77",
  "M79",
  "M80",
  "M81",
  "M82",
  "M85",
  "M87",
] as const;

export type ThirdPlaceMatchId = (typeof THIRD_PLACE_MATCH_IDS)[number];

export type StageId =
  | "roundOf32"
  | "roundOf16"
  | "quarterFinal"
  | "semiFinal"
  | "bronzeFinal"
  | "final";

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  code: string;
  group: GroupId;
  flag: string;
  brandingAsset: string;
}

export interface GroupDefinition {
  id: GroupId;
  label: string;
  color: string;
  accent: string;
  teams: TeamId[];
}

export interface MatchMeta {
  matchId: MatchId;
  stage: StageId;
  date: string;
  venue: string;
  city: string;
}

export interface PlacementRef {
  kind: "placement";
  group: GroupId;
  place: 1 | 2;
}

export interface ThirdPlaceRef {
  kind: "third";
  allowedGroups: GroupId[];
}

export interface WinnerRef {
  kind: "winner";
  matchId: MatchId;
}

export interface LoserRef {
  kind: "loser";
  matchId: MatchId;
}

export type ParticipantRef =
  | PlacementRef
  | ThirdPlaceRef
  | WinnerRef
  | LoserRef;

export interface KnockoutSlot {
  matchId: MatchId;
  stage: StageId;
  sideA: ParticipantRef;
  sideB: ParticipantRef;
  meta: MatchMeta;
}

export interface FixtureState {
  version: number;
  groupOrders: Record<GroupId, TeamId[]>;
  qualifiedThirdPlaces: TeamId[];
  thirdPlaceAssignments: Partial<Record<ThirdPlaceMatchId, TeamId>>;
  knockoutWinners: Partial<Record<MatchId, TeamId>>;
}

export interface DerivedTeam {
  id: TeamId;
  name: string;
  shortName: string;
  code: string;
  group: GroupId;
  flag: string;
  brandingAsset: string;
}

export interface DerivedMatch {
  matchId: MatchId;
  stage: StageId;
  meta: MatchMeta;
  sideA: DerivedTeam | null;
  sideB: DerivedTeam | null;
  sideALabel: string;
  sideBLabel: string;
  winnerId?: TeamId;
  loserId?: TeamId;
}
