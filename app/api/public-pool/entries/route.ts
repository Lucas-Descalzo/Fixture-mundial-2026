import { NextResponse } from "next/server";

import { ensurePublicPoolGroup, saveGroupEntry } from "@/lib/group-service";

export const runtime = "nodejs";

function getSaveStatusCode(errorCode?: string) {
  switch (errorCode) {
    case "DATABASE_UNAVAILABLE":
      return 503;
    case "GROUP_NOT_FOUND":
      return 404;
    case "INVALID_IDENTITY":
    case "INVALID_EDIT_KEY":
    case "INCOMPLETE_FIXTURE":
    case "NAME_TAKEN":
      return 400;
    case "LOCKED":
      return 423;
    case "GROUP_CLOSED":
      return 409;
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
    fixtureState?: unknown;
  };

  const result = await saveGroupEntry({
    groupSlug: poolGroup?.slug ?? "",
    firstName: body.firstName ?? "",
    lastName: body.lastName ?? "",
    editKey: body.editKey ?? "",
    fixtureState: body.fixtureState as never,
  });

  if (!result.saved) {
    return NextResponse.json(
      {
        saved: false,
        remainingMatches: result.remainingMatches,
        isUpdate: result.isUpdate,
        deadlineReached: result.deadlineReached,
        lockedUntilUtc: result.lockedUntilUtc ?? null,
        errorCode: result.errorCode,
        message: result.message,
      },
      { status: getSaveStatusCode(result.errorCode) },
    );
  }

  return NextResponse.json({
    saved: true,
    remainingMatches: 0,
    isUpdate: result.isUpdate,
    deadlineReached: false,
  });
}
