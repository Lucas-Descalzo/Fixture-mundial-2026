import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { updateAdminGroupScoring } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSession(adminCookie)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const { groupId } = await context.params;
  const body = (await request.json()) as { scoringEnabled?: boolean };
  const updated = await updateAdminGroupScoring(groupId, Boolean(body.scoringEnabled));

  if (!updated) {
    return NextResponse.json({ ok: false, message: "No encontre ese grupo." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
