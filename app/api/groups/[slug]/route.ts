import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db";
import { getGroupPageData } from "@/lib/group-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "DATABASE_UNAVAILABLE",
        message: "La base de datos todavia no esta configurada.",
      },
      { status: 503 },
    );
  }

  const { slug } = await context.params;
  const data = await getGroupPageData(slug);

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "GROUP_NOT_FOUND",
        message: "No encontramos ese grupo.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data,
  });
}
