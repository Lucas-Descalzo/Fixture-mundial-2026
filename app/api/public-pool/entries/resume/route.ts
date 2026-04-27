import { NextResponse } from "next/server";

import { ensurePublicPoolGroup, resumeGroupEntry } from "@/lib/group-service";

export const runtime = "nodejs";

function getResumeStatusCode(errorCode?: string) {
  switch (errorCode) {
    case "DATABASE_UNAVAILABLE":
      return 503;
    case "GROUP_NOT_FOUND":
      return 404;
    case "INVALID_IDENTITY":
    case "INVALID_EDIT_KEY":
      return 400;
    case "INVALID_CREDENTIALS":
      return 401;
    case "GROUP_CLOSED":
      return 409;
    case "LOCKED":
      return 423;
    default:
      return 500;
  }
}

export async function POST(request: Request) {
  const poolGroup = await ensurePublicPoolGroup();

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    editKey?: string;
  };

  const result = await resumeGroupEntry({
    groupSlug: poolGroup?.slug ?? "",
    firstName: body.firstName ?? "",
    lastName: body.lastName ?? "",
    editKey: body.editKey ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        deadlineReached: result.deadlineReached ?? false,
        lockedUntilUtc: result.lockedUntilUtc ?? null,
        errorCode: result.errorCode,
        message: result.message,
      },
      { status: getResumeStatusCode(result.errorCode) },
    );
  }

  return NextResponse.json({
    ok: true,
    fixtureState: result.fixtureState,
  });
}
