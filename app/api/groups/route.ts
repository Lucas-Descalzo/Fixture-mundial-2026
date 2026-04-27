import { NextResponse } from "next/server";

import { createGroup } from "@/lib/group-service";

export const runtime = "nodejs";

function getStatusCode(errorCode?: string) {
  switch (errorCode) {
    case "DATABASE_UNAVAILABLE":
      return 503;
    case "INVALID_NAME":
    case "INVALID_DEADLINE":
    case "PAST_DEADLINE":
      return 400;
    default:
      return 500;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    deadlineLocal?: string;
    scoringEnabled?: boolean;
  };

  const result = await createGroup({
    name: body.name ?? "",
    deadlineLocal: body.deadlineLocal ?? "",
    scoringEnabled: Boolean(body.scoringEnabled),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: result.errorCode,
        message: result.message,
      },
      { status: getStatusCode(result.errorCode) },
    );
  }

  return NextResponse.json({
    ok: true,
    group: result.group,
    url: `/grupos/${result.group?.slug ?? ""}`,
  });
}
