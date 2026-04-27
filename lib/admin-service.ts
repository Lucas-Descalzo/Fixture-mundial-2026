import { ensureDatabaseSchema, getSql, isDatabaseConfigured } from "@/lib/db";
import { ensurePublicPoolGroup, PUBLIC_POOL_SLUG } from "@/lib/group-service";
import { getOfficialFixtureStateRecord } from "@/lib/official-results-service";
import { scoreFixture, type FixtureScoreBreakdown } from "@/lib/scoring";
import type { FixtureState } from "@/lib/world-cup-types";

type StatsRow = {
  total_groups: number;
  total_entries: number;
  total_public_pool_entries: number;
};

type GroupListRow = {
  id: string;
  slug: string;
  name: string;
  deadline_at_utc: string | Date;
  created_at: string | Date;
  participants: number;
  scoring_enabled: boolean;
  is_public_pool: boolean;
};

type EntryListRow = {
  id: string;
  group_slug: string;
  group_name: string;
  group_is_public_pool: boolean;
  first_name: string;
  last_name: string;
  submitted_at: string | Date;
  updated_at: string | Date;
  fixture_state_json: string | FixtureState;
};

export interface AdminRankingRow {
  entryId: string;
  groupSlug: string;
  groupName: string;
  displayName: string;
  updatedAt: string;
  score: FixtureScoreBreakdown;
}

export interface AdminDashboardData {
  totalGroups: number;
  totalEntries: number;
  totalPublicPoolEntries: number;
  officialResultsUpdatedAt: string | null;
  officialFixtureState: FixtureState | null;
  globalRanking: AdminRankingRow[];
  groupRankings: Array<{
    groupId: string;
    groupSlug: string;
    groupName: string;
    ranking: AdminRankingRow[];
  }>;
  latestGroups: Array<{
    id: string;
    slug: string;
    name: string;
    deadlineAtUtc: string;
    createdAt: string;
    participants: number;
    scoringEnabled: boolean;
    isPublicPool: boolean;
  }>;
  latestEntries: Array<{
    id: string;
    groupSlug: string;
    groupName: string;
    firstName: string;
    lastName: string;
    submittedAt: string;
    updatedAt: string;
    fixtureState: FixtureState;
  }>;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseSchema();
  await ensurePublicPoolGroup();
  const sql = getSql();
  const officialRecord = await getOfficialFixtureStateRecord();
  const officialFixtureState = officialRecord?.fixtureState ?? null;

  const statsRows = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM groups) AS total_groups,
      (SELECT COUNT(*)::int FROM entries) AS total_entries,
      (
        SELECT COUNT(*)::int
        FROM entries e
        JOIN groups g ON g.id = e.group_id
        WHERE g.is_public_pool = true
      ) AS total_public_pool_entries
  `) as StatsRow[];

  const groupRows = (await sql`
    SELECT
      g.id,
      g.slug,
      g.name,
      g.deadline_at_utc,
      g.created_at,
      g.scoring_enabled,
      g.is_public_pool,
      COUNT(e.id)::int AS participants
    FROM groups g
    LEFT JOIN entries e ON e.group_id = g.id
    GROUP BY
      g.id,
      g.slug,
      g.name,
      g.deadline_at_utc,
      g.created_at,
      g.scoring_enabled,
      g.is_public_pool
    ORDER BY g.created_at DESC
  `) as GroupListRow[];

  const entryRows = (await sql`
    SELECT
      e.id,
      g.slug AS group_slug,
      g.name AS group_name,
      g.is_public_pool AS group_is_public_pool,
      e.first_name,
      e.last_name,
      e.submitted_at,
      e.updated_at,
      e.fixture_state_json
    FROM entries e
    JOIN groups g ON g.id = e.group_id
    ORDER BY e.updated_at DESC
  `) as EntryListRow[];

  const stats = statsRows[0] ?? {
    total_groups: 0,
    total_entries: 0,
    total_public_pool_entries: 0,
  };
  const latestEntries = entryRows.map((row) => ({
    id: row.id,
    groupSlug: row.group_slug,
    groupName: row.group_name,
    groupIsPublicPool: row.group_is_public_pool,
    firstName: row.first_name,
    lastName: row.last_name,
    submittedAt: new Date(row.submitted_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    fixtureState:
      typeof row.fixture_state_json === "string"
        ? (JSON.parse(row.fixture_state_json) as FixtureState)
        : (row.fixture_state_json as FixtureState),
  }));

  const scoredEntries = officialFixtureState
    ? latestEntries.map((entry) => ({
        entryId: entry.id,
        groupSlug: entry.groupSlug,
        groupName: entry.groupName,
        groupIsPublicPool: entry.groupIsPublicPool,
        displayName: `${entry.firstName} ${entry.lastName}`,
        updatedAt: entry.updatedAt,
        score: scoreFixture(entry.fixtureState, officialFixtureState),
      }))
    : [];

  const latestGroups = groupRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    deadlineAtUtc: new Date(row.deadline_at_utc).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    participants: row.participants,
    scoringEnabled: row.scoring_enabled,
    isPublicPool: row.is_public_pool,
  }));

  const groupRankings = latestGroups
    .filter((group) => group.scoringEnabled && !group.isPublicPool)
    .map((group) => ({
      groupId: group.id,
      groupSlug: group.slug,
      groupName: group.name,
      ranking: scoredEntries
        .filter((entry) => entry.groupSlug === group.slug)
        .sort((left, right) => {
          if (right.score.total !== left.score.total) {
            return right.score.total - left.score.total;
          }

          return left.displayName.localeCompare(right.displayName, "es-AR");
        }),
    }));

  return {
    totalGroups: stats.total_groups,
    totalEntries: stats.total_entries,
    totalPublicPoolEntries: stats.total_public_pool_entries,
    officialResultsUpdatedAt: officialRecord?.updatedAt ?? null,
    officialFixtureState,
    globalRanking: scoredEntries
      .filter((entry) => entry.groupIsPublicPool || entry.groupSlug === PUBLIC_POOL_SLUG)
      .sort((left, right) => {
        if (right.score.total !== left.score.total) {
          return right.score.total - left.score.total;
        }

        return left.displayName.localeCompare(right.displayName, "es-AR");
      }),
    groupRankings,
    latestGroups,
    latestEntries,
  };
}

export async function deleteAdminGroup(groupId: string) {
  if (!isDatabaseConfigured()) {
    return false;
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM groups
    WHERE id = ${groupId} AND is_public_pool = false
    RETURNING id
  `) as Array<{ id: string }>;

  return rows.length > 0;
}

export async function deleteAdminEntry(entryId: string) {
  if (!isDatabaseConfigured()) {
    return false;
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM entries
    WHERE id = ${entryId}
    RETURNING id
  `) as Array<{ id: string }>;

  return rows.length > 0;
}

export async function updateAdminGroupScoring(groupId: string, scoringEnabled: boolean) {
  if (!isDatabaseConfigured()) {
    return false;
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    UPDATE groups
    SET scoring_enabled = ${scoringEnabled}
    WHERE id = ${groupId} AND is_public_pool = false
    RETURNING id
  `) as Array<{ id: string }>;

  return rows.length > 0;
}
