import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { deleteAdminEntry } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSession(adminCookie)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const { entryId } = await context.params;
  const deleted = await deleteAdminEntry(entryId);

  if (!deleted) {
    return NextResponse.json({ ok: false, message: "No encontré ese fixture." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
