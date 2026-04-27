import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { deleteAdminGroup } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSession(adminCookie)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const { groupId } = await context.params;
  const deleted = await deleteAdminGroup(groupId);

  if (!deleted) {
    return NextResponse.json({ ok: false, message: "No encontré ese grupo." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
