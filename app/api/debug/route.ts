import { NextRequest, NextResponse } from "next/server";
import { getEnv, isDatabaseEnvValid } from "@/server/env";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();
    const maskedUrl = env.POSTGRES_URL.replace(
      /\/\/([^:]+):([^@]+)@/,
      "//$1:****@"
    );
    const envInfo = {
      ADMIN_EMAIL: env.ADMIN_EMAIL,
      ADMIN_PASSWORD_SET: !!env.ADMIN_PASSWORD,
      AUTH_SECRET_SET: !!env.AUTH_SECRET,
      NODE_ENV: env.NODE_ENV,
      POSTGRES_URL: maskedUrl,
      DATABASE_ENV_VALID: isDatabaseEnvValid(),
    };

    let dbStatus = "unknown";
    try {
      const result = await db.query.admins.findFirst();
      dbStatus = result ? "connected, admin exists" : "connected, no admin";
    } catch (dbError: any) {
      dbStatus = `error: ${dbError.message}`;
    }

    return NextResponse.json({
      env: envInfo,
      dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
