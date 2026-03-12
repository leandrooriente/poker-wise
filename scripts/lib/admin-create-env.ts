export interface AdminCreateEnv {
  POSTGRES_URL: string;
}

export function getAdminCreateEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): AdminCreateEnv {
  const postgresUrl = env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error(
      "Missing POSTGRES_URL. Pull production env first with `vercel env pull .env.production.local --environment=production`."
    );
  }

  return {
    POSTGRES_URL: postgresUrl,
  };
}
