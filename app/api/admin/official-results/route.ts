import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  getOfficialFixtureStateRecord,
  saveOfficialFixtureState,
} from "@/lib/official-results-service";
import type { FixtureState } from "@/lib/world-cup-types";

export const runtime = "nodejs";

async function isAuthorized() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSession(adminCookie);
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const record = await getOfficialFixtureStateRecord();

  return NextResponse.json({
    ok: true,
    fixtureState: record?.fixtureState ?? null,
    updatedAt: record?.updatedAt ?? null,
  });
}

export async function PUT(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as { fixtureState?: Partial<FixtureState> };
  const record = await saveOfficialFixtureState(body.fixtureState ?? {});

  if (!record) {
    return NextResponse.json(
      { ok: false, message: "No pudimos guardar los resultados reales." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    fixtureState: record.fixtureState,
    updatedAt: record.updatedAt,
  });
}
