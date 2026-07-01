export type CronAuthorizationResult =
  | { authorized: true }
  | { authorized: false };

export function authorizeCronRequest(
  request: Pick<Request, "headers">,
  cronSecret = process.env.CRON_SECRET
): CronAuthorizationResult {
  const configuredSecret = cronSecret?.trim();

  if (!configuredSecret) {
    return { authorized: true };
  }

  const authorizationHeader = request.headers.get("authorization");

  if (authorizationHeader === `Bearer ${configuredSecret}`) {
    return { authorized: true };
  }

  return { authorized: false };
}
