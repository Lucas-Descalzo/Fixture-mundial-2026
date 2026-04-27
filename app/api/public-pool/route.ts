import { NextResponse } from "next/server";

import { getPublicPoolPageData } from "@/lib/group-service";

export const runtime = "nodejs";

export async function GET() {
  const data = await getPublicPoolPageData();

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "DATABASE_UNAVAILABLE",
        message: "La base de datos todavia no esta configurada.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
