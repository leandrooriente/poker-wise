import { NextRequest, NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/cron/authorization";
import { pingDatabase } from "@/server/db/keepalive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = authorizeCronRequest(request);

  if (!authorization.authorized) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await pingDatabase();

    return NextResponse.json({
      status: "ok",
      database: "reachable",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("GET /api/keepalive error:", error);

    return NextResponse.json(
      { status: "error", error: "Database keepalive failed" },
      { status: 500 }
    );
  }
}
