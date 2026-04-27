import { createInitialFixtureState, normalizeFixtureState } from "@/lib/world-cup-fixture";
import { hashEditKey, normalizeEditKey, verifyEditKey } from "@/lib/group-auth";
import {
  asIsoString,
  ensureDatabaseSchema,
  getSql,
  isDatabaseConfigured,
  parseJsonColumn,
} from "@/lib/db";
import type {
  CreateGroupInput,
  CreateGroupResult,
  EntryRecord,
  GroupPageData,
  GroupParticipant,
  GroupRecord,
  RankingRow,
  ResumeEntryInput,
  ResumeEntryResult,
  SaveEntryInput,
  SaveEntryResult,
} from "@/lib/group-types";
import { getOfficialFixtureState } from "@/lib/official-results-service";
import { scoreFixture } from "@/lib/scoring";
import {
  createGroupSlug,
  formatDisplayName,
  getRemainingKnockoutMatchesCount,
  isDeadlineReached,
  normalizeFullName,
  normalizePersonNamePart,
  parseArgentinaDateTimeToUtc,
} from "@/lib/group-utils";
import type { FixtureState } from "@/lib/world-cup-types";

const MAX_RESUME_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;
export const PUBLIC_POOL_SLUG = "tabla-general";
export const PUBLIC_POOL_NAME = "Tabla general";
export const PUBLIC_POOL_DEADLINE_UTC = "2026-06-11T19:00:00.000Z";

type GroupRow = {
  id: string;
  slug: string;
  name: string;
  deadline_at_utc: string | Date;
  scoring_enabled: boolean;
  is_public_pool: boolean;
  created_at: string | Date;
};

type EntryRow = {
  id: string;
  group_id: string;
  first_name: string;
  last_name: string;
  full_name_normalized: string;
  edit_key_hash: string;
  edit_key_salt: string;
  fixture_state_json: unknown;
  submitted_at: string | Date;
  updated_at: string | Date;
  failed_resume_attempts: number;
  resume_locked_until_utc: string | Date | null;
};

type SqlClient = ReturnType<typeof getSql>;

function mapGroupRow(row: GroupRow): GroupRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    deadlineAtUtc: new Date(row.deadline_at_utc).toISOString(),
    scoringEnabled: row.scoring_enabled,
    isPublicPool: row.is_public_pool,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapEntryRow(row: EntryRow): EntryRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullNameNormalized: row.full_name_normalized,
    editKeyHash: row.edit_key_hash,
    editKeySalt: row.edit_key_salt,
    fixtureState: normalizeFixtureState(
      parseJsonColumn<FixtureState | Partial<FixtureState>>(row.fixture_state_json),
    ),
    submittedAt: new Date(row.submitted_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    failedResumeAttempts: row.failed_resume_attempts,
    resumeLockedUntilUtc: asIsoString(row.resume_locked_until_utc),
  };
}

function mapParticipant(entry: EntryRecord, includeFixtureState: boolean): GroupParticipant {
  return {
    id: entry.id,
    displayName: formatDisplayName(entry.firstName, entry.lastName),
    firstName: entry.firstName,
    lastName: entry.lastName,
    submittedAt: entry.submittedAt,
    updatedAt: entry.updatedAt,
    fixtureState: includeFixtureState ? entry.fixtureState : undefined,
  };
}

function getLockExpiration(now = new Date()) {
  return new Date(now.getTime() + LOCKOUT_SECONDS * 1000).toISOString();
}

async function findGroupBySlug(sql: SqlClient, slug: string) {
  const rows = (await sql`
    SELECT id, slug, name, deadline_at_utc, scoring_enabled, is_public_pool, created_at
    FROM groups
    WHERE slug = ${slug}
    LIMIT 1
  `) as GroupRow[];

  const row = rows[0];
  return row ? mapGroupRow(row) : null;
}

export async function ensurePublicPoolGroup(): Promise<GroupRecord | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseSchema();
  const sql = getSql();

  const existingRows = (await sql`
    SELECT id, slug, name, deadline_at_utc, scoring_enabled, is_public_pool, created_at
    FROM groups
    WHERE is_public_pool = true
    LIMIT 1
  `) as GroupRow[];

  if (existingRows[0]) {
    return mapGroupRow(existingRows[0]);
  }

  const rows = (await sql`
    INSERT INTO groups (slug, name, deadline_at_utc, scoring_enabled, is_public_pool)
    VALUES (
      ${PUBLIC_POOL_SLUG},
      ${PUBLIC_POOL_NAME},
      ${PUBLIC_POOL_DEADLINE_UTC}::timestamptz,
      true,
      true
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      deadline_at_utc = EXCLUDED.deadline_at_utc,
      scoring_enabled = true,
      is_public_pool = true
    RETURNING id, slug, name, deadline_at_utc, scoring_enabled, is_public_pool, created_at
  `) as GroupRow[];

  return rows[0] ? mapGroupRow(rows[0]) : null;
}

export async function getPublicPoolPageData() {
  const group = await ensurePublicPoolGroup();
  if (!group) {
    return null;
  }

  return getGroupPageData(group.slug);
}

function buildRanking(entries: EntryRecord[], officialState: FixtureState | null): RankingRow[] {
  if (!officialState) {
    return [];
  }

  return entries
    .map((entry) => {
      const score = scoreFixture(entry.fixtureState, officialState);

      return {
        entryId: entry.id,
        displayName: formatDisplayName(entry.firstName, entry.lastName),
        updatedAt: entry.updatedAt,
        groupClassificationPoints: score.groupClassificationPoints,
        groupExactPositionPoints: score.groupExactPositionPoints,
        roundOf32Points: score.roundOf32Points,
        roundOf16Points: score.roundOf16Points,
        quarterFinalPoints: score.quarterFinalPoints,
        semiFinalPoints: score.semiFinalPoints,
        finalistPoints: score.finalistPoints,
        exactFinalBonus: score.exactFinalBonus,
        championBonus: score.championBonus,
        thirdPlaceBonus: score.thirdPlaceBonus,
        total: score.total,
        scoredUnits: score.scoredUnits,
        pendingUnits: score.pendingUnits,
      };
    })
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }

      return left.displayName.localeCompare(right.displayName, "es-AR");
    });
}

async function findEntryByNormalizedName(
  sql: SqlClient,
  groupId: string,
  fullNameNormalized: string,
) {
  const rows = (await sql`
    SELECT
      id,
      group_id,
      first_name,
      last_name,
      full_name_normalized,
      edit_key_hash,
      edit_key_salt,
      fixture_state_json,
      submitted_at,
      updated_at,
      failed_resume_attempts,
      resume_locked_until_utc
    FROM entries
    WHERE group_id = ${groupId} AND full_name_normalized = ${fullNameNormalized}
    LIMIT 1
  `) as EntryRow[];

  const row = rows[0];
  return row ? mapEntryRow(row) : null;
}

async function clearEntryLock(sql: SqlClient, entryId: string) {
  await sql`
    UPDATE entries
    SET failed_resume_attempts = 0, resume_locked_until_utc = NULL
    WHERE id = ${entryId}
  `;
}

async function registerFailedAttempt(
  sql: SqlClient,
  entry: EntryRecord,
  now: Date,
) {
  const nextAttempts = entry.failedResumeAttempts + 1;

  if (nextAttempts >= MAX_RESUME_ATTEMPTS) {
    const lockedUntilUtc = getLockExpiration(now);

    await sql`
      UPDATE entries
      SET failed_resume_attempts = 0, resume_locked_until_utc = ${lockedUntilUtc}::timestamptz
      WHERE id = ${entry.id}
    `;

    return lockedUntilUtc;
  }

  await sql`
    UPDATE entries
    SET failed_resume_attempts = ${nextAttempts}
    WHERE id = ${entry.id}
  `;

  return null;
}

function validateIdentity(firstName: string, lastName: string, editKey: string) {
  if (!normalizePersonNamePart(firstName) || !normalizePersonNamePart(lastName)) {
    return {
      ok: false,
      errorCode: "INVALID_IDENTITY" as const,
      message: "Nombre y apellido son obligatorios.",
    };
  }

  if (!normalizeEditKey(editKey)) {
    return {
      ok: false,
      errorCode: "INVALID_EDIT_KEY" as const,
      message: "La clave es obligatoria.",
    };
  }

  return { ok: true } as const;
}

export async function getGroupPageData(slug: string): Promise<GroupPageData | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const group = await findGroupBySlug(sql, slug);

  if (!group) {
    return null;
  }

  const includeFixtureState = isDeadlineReached(group.deadlineAtUtc);
  const rows = (await sql`
    SELECT
      id,
      group_id,
      first_name,
      last_name,
      full_name_normalized,
      edit_key_hash,
      edit_key_salt,
      fixture_state_json,
      submitted_at,
      updated_at,
      failed_resume_attempts,
      resume_locked_until_utc
    FROM entries
    WHERE group_id = ${group.id}
    ORDER BY full_name_normalized ASC
  `) as EntryRow[];

  const participants = rows
    .map((row) => mapEntryRow(row))
    .map((entry) => mapParticipant(entry, includeFixtureState));
  const entries = rows.map((row) => mapEntryRow(row));
  const officialState =
    group.scoringEnabled || group.isPublicPool ? await getOfficialFixtureState() : null;

  return {
    group,
    isClosed: includeFixtureState,
    participants,
    ranking: buildRanking(entries, officialState),
    hasOfficialResults: Boolean(officialState),
  };
}

export async function createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      errorCode: "DATABASE_UNAVAILABLE",
      message: "La base de datos todavia no esta configurada.",
    };
  }

  const name = normalizePersonNamePart(input.name);
  if (!name) {
    return {
      ok: false,
      errorCode: "INVALID_NAME",
      message: "El nombre del grupo es obligatorio.",
    };
  }

  const deadlineAtUtc = parseArgentinaDateTimeToUtc(input.deadlineLocal);
  if (!deadlineAtUtc) {
    return {
      ok: false,
      errorCode: "INVALID_DEADLINE",
      message: "La fecha limite no tiene un formato valido.",
    };
  }

  if (isDeadlineReached(deadlineAtUtc)) {
    return {
      ok: false,
      errorCode: "PAST_DEADLINE",
      message: "La fecha limite debe estar en el futuro.",
    };
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const scoringEnabled = Boolean(input.scoringEnabled);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = createGroupSlug(name);

    try {
      const rows = (await sql`
        INSERT INTO groups (slug, name, deadline_at_utc, scoring_enabled, is_public_pool)
        VALUES (${slug}, ${name}, ${deadlineAtUtc}::timestamptz, ${scoringEnabled}, false)
        RETURNING id, slug, name, deadline_at_utc, scoring_enabled, is_public_pool, created_at
      `) as GroupRow[];

      return {
        ok: true,
        group: mapGroupRow(rows[0]),
      };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        continue;
      }

      return {
        ok: false,
        errorCode: "CREATE_FAILED",
        message: "No pudimos crear el grupo en este momento.",
      };
    }
  }

  return {
    ok: false,
    errorCode: "CREATE_FAILED",
    message: "No pudimos generar un link unico para el grupo.",
  };
}

export async function saveGroupEntry(input: SaveEntryInput): Promise<SaveEntryResult> {
  const normalizedFixtureState = normalizeFixtureState(
    input.fixtureState ?? createInitialFixtureState(),
  );
  const remainingMatches = getRemainingKnockoutMatchesCount(normalizedFixtureState);

  if (!isDatabaseConfigured()) {
    return {
      saved: false,
      remainingMatches,
      isUpdate: false,
      deadlineReached: false,
      errorCode: "DATABASE_UNAVAILABLE",
      message: "La base de datos todavia no esta configurada.",
    };
  }

  await ensureDatabaseSchema();
  const identityValidation = validateIdentity(input.firstName, input.lastName, input.editKey);
  if (!identityValidation.ok) {
    return {
      saved: false,
      remainingMatches,
      isUpdate: false,
      deadlineReached: false,
      errorCode: identityValidation.errorCode,
      message: identityValidation.message,
    };
  }

  if (remainingMatches > 0) {
    return {
      saved: false,
      remainingMatches,
      isUpdate: false,
      deadlineReached: false,
      errorCode: "INCOMPLETE_FIXTURE",
      message: "Todavia faltan cruces por definir.",
    };
  }

  const sql = getSql();
  const group = await findGroupBySlug(sql, input.groupSlug);

  if (!group) {
    return {
      saved: false,
      remainingMatches,
      isUpdate: false,
      deadlineReached: false,
      errorCode: "GROUP_NOT_FOUND",
      message: "No encontramos ese grupo.",
    };
  }

  if (isDeadlineReached(group.deadlineAtUtc)) {
    return {
      saved: false,
      remainingMatches,
      isUpdate: false,
      deadlineReached: true,
      errorCode: "GROUP_CLOSED",
      message: "Las predicciones de este grupo ya cerraron.",
    };
  }

  const firstName = normalizePersonNamePart(input.firstName);
  const lastName = normalizePersonNamePart(input.lastName);
  const fullNameNormalized = normalizeFullName(firstName, lastName);
  const existingEntry = await findEntryByNormalizedName(sql, group.id, fullNameNormalized);
  const now = new Date();

  if (!existingEntry) {
    const { hash, salt } = hashEditKey(input.editKey);

    try {
      await sql`
        INSERT INTO entries (
          group_id,
          first_name,
          last_name,
          full_name_normalized,
          edit_key_hash,
          edit_key_salt,
          fixture_state_json
        )
        VALUES (
          ${group.id},
          ${firstName},
          ${lastName},
          ${fullNameNormalized},
          ${hash},
          ${salt},
          ${JSON.stringify(normalizedFixtureState)}::jsonb
        )
      `;

      return {
        saved: true,
        remainingMatches: 0,
        isUpdate: false,
        deadlineReached: false,
      };
    } catch {
      return {
        saved: false,
        remainingMatches: 0,
        isUpdate: false,
        deadlineReached: false,
        errorCode: "SAVE_FAILED",
        message: "No pudimos guardar tu fixture.",
      };
    }
  }

  if (
    existingEntry.resumeLockedUntilUtc &&
    !isDeadlineReached(existingEntry.resumeLockedUntilUtc, now)
  ) {
    return {
      saved: false,
      remainingMatches: 0,
      isUpdate: true,
      deadlineReached: false,
      lockedUntilUtc: existingEntry.resumeLockedUntilUtc,
      errorCode: "LOCKED",
      message: "Esa participacion esta temporalmente bloqueada.",
    };
  }

  if (
    !verifyEditKey(
      input.editKey,
      existingEntry.editKeySalt,
      existingEntry.editKeyHash,
    )
  ) {
    const lockedUntilUtc = await registerFailedAttempt(sql, existingEntry, now);

    return {
      saved: false,
      remainingMatches: 0,
      isUpdate: true,
      deadlineReached: false,
      lockedUntilUtc,
      errorCode: lockedUntilUtc ? "LOCKED" : "NAME_TAKEN",
      message: lockedUntilUtc
        ? "Esa participacion quedo bloqueada por 60 segundos."
        : "Ya existe una participacion con ese nombre y apellido. Si sos vos, usa la misma clave. Si no, diferencia tu nombre o apellido.",
    };
  }

  await sql`
    UPDATE entries
    SET
      first_name = ${firstName},
      last_name = ${lastName},
      fixture_state_json = ${JSON.stringify(normalizedFixtureState)}::jsonb,
      updated_at = NOW(),
      failed_resume_attempts = 0,
      resume_locked_until_utc = NULL
    WHERE id = ${existingEntry.id}
  `;

  return {
    saved: true,
    remainingMatches: 0,
    isUpdate: true,
    deadlineReached: false,
  };
}

export async function resumeGroupEntry(input: ResumeEntryInput): Promise<ResumeEntryResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      errorCode: "DATABASE_UNAVAILABLE",
      message: "La base de datos todavia no esta configurada.",
    };
  }

  await ensureDatabaseSchema();
  const identityValidation = validateIdentity(input.firstName, input.lastName, input.editKey);
  if (!identityValidation.ok) {
    return {
      ok: false,
      errorCode: identityValidation.errorCode,
      message: identityValidation.message,
    };
  }

  const sql = getSql();
  const group = await findGroupBySlug(sql, input.groupSlug);

  if (!group) {
    return {
      ok: false,
      errorCode: "GROUP_NOT_FOUND",
      message: "No encontramos ese grupo.",
    };
  }

  const fullNameNormalized = normalizeFullName(input.firstName, input.lastName);
  const entry = await findEntryByNormalizedName(sql, group.id, fullNameNormalized);

  if (!entry) {
    return {
      ok: false,
      errorCode: "INVALID_CREDENTIALS",
      message: "No pudimos validar esos datos.",
    };
  }

  const now = new Date();
  if (entry.resumeLockedUntilUtc && !isDeadlineReached(entry.resumeLockedUntilUtc, now)) {
    return {
      ok: false,
      lockedUntilUtc: entry.resumeLockedUntilUtc,
      errorCode: "LOCKED",
      message: "Esa participacion esta temporalmente bloqueada.",
    };
  }

  if (!verifyEditKey(input.editKey, entry.editKeySalt, entry.editKeyHash)) {
    const lockedUntilUtc = await registerFailedAttempt(sql, entry, now);

    return {
      ok: false,
      lockedUntilUtc,
      errorCode: lockedUntilUtc ? "LOCKED" : "INVALID_CREDENTIALS",
      message: lockedUntilUtc
        ? "Esa participacion quedo bloqueada por 60 segundos."
        : "No pudimos validar esos datos.",
    };
  }

  await clearEntryLock(sql, entry.id);

  if (isDeadlineReached(group.deadlineAtUtc, now)) {
    return {
      ok: false,
      deadlineReached: true,
      errorCode: "GROUP_CLOSED",
      message: "Las predicciones de este grupo ya cerraron.",
    };
  }

  return {
    ok: true,
    fixtureState: entry.fixtureState,
  };
}
