export type PostgresWriteFreezeMode = "freeze" | "unfreeze";

export interface PostgresWriteFreezeOptions {
  mode: PostgresWriteFreezeMode;
  envFile: string;
  sslNoVerify: boolean;
}

const CONFIRMATIONS: Record<PostgresWriteFreezeMode, string> = {
  freeze: "FREEZE_PRODUCTION_WRITES",
  unfreeze: "UNFREEZE_PRODUCTION_WRITES",
};

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

export function parsePostgresWriteFreezeArgs(
  args: string[]
): PostgresWriteFreezeOptions {
  const mode = args[0];
  if (mode !== "freeze" && mode !== "unfreeze") {
    throw new Error(
      "Usage: npm run db:writes:freeze|db:writes:unfreeze -- --confirm=<confirmation> [--env-file=<path>] [--ssl-no-verify]"
    );
  }

  const requiredConfirmation = CONFIRMATIONS[mode];
  if (optionValue(args, "confirm") !== requiredConfirmation) {
    throw new Error(`${mode} requires --confirm=${requiredConfirmation}`);
  }

  return {
    mode,
    envFile: optionValue(args, "env-file") ?? ".env.production.local",
    sslNoVerify: args.includes("--ssl-no-verify"),
  };
}

export function quotePostgresIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
