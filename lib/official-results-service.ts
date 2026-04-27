import { ensureDatabaseSchema, getSql, isDatabaseConfigured, parseJsonColumn } from "@/lib/db";
import { normalizeFixtureState } from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

const OFFICIAL_FIXTURE_STATE_KEY = "official_fixture_state";

type SettingRow = {
  value_json: unknown;
  updated_at: string | Date;
};

export interface OfficialFixtureStateRecord {
  fixtureState: FixtureState;
  updatedAt: string;
}

export async function getOfficialFixtureStateRecord(): Promise<OfficialFixtureStateRecord | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT value_json, updated_at
    FROM app_settings
    WHERE key = ${OFFICIAL_FIXTURE_STATE_KEY}
    LIMIT 1
  `) as SettingRow[];

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    fixtureState: normalizeFixtureState(
      parseJsonColumn<FixtureState | Partial<FixtureState>>(row.value_json),
    ),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getOfficialFixtureState() {
  const record = await getOfficialFixtureStateRecord();
  return record?.fixtureState ?? null;
}

export async function saveOfficialFixtureState(source: Partial<FixtureState> | FixtureState) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseSchema();
  const fixtureState = normalizeFixtureState(source);
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO app_settings (key, value_json, updated_at)
    VALUES (${OFFICIAL_FIXTURE_STATE_KEY}, ${JSON.stringify(fixtureState)}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
    RETURNING value_json, updated_at
  `) as SettingRow[];

  const row = rows[0];
  return row
    ? {
        fixtureState: normalizeFixtureState(
          parseJsonColumn<FixtureState | Partial<FixtureState>>(row.value_json),
        ),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}
