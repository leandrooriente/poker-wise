export interface ParsedCreateAdminArgs {
  email: string;
  password: string;
  groupSlugs: string[];
  grantAllGroups: boolean;
}

const HELP_TEXT = [
  "Usage: npm run admin:create -- <email> <password> [--group <slug> ...] [--all-groups]",
  "",
  "Examples:",
  "  npm run admin:create -- owner@example.com 'super-secret'",
  "  npm run admin:create -- owner@example.com 'super-secret' --group club-night --group cash-game",
  "  npm run admin:create -- owner@example.com 'super-secret' --all-groups",
].join("\n");

export function getCreateAdminHelpText() {
  return HELP_TEXT;
}

export function parseCreateAdminArgs(argv: string[]): ParsedCreateAdminArgs {
  const positional: string[] = [];
  const groupSlugs: string[] = [];
  let grantAllGroups = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      throw new Error(HELP_TEXT);
    }

    if (arg === "--all-groups") {
      grantAllGroups = true;
      continue;
    }

    if (arg === "--group") {
      const slug = argv[index + 1];
      if (!slug || slug.startsWith("--")) {
        throw new Error("Missing value for --group\n\n" + HELP_TEXT);
      }
      groupSlugs.push(slug);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}\n\n${HELP_TEXT}`);
    }

    positional.push(arg);
  }

  const [email, password] = positional;
  if (!email || !password) {
    throw new Error("Email and password are required\n\n" + HELP_TEXT);
  }

  if (grantAllGroups && groupSlugs.length > 0) {
    throw new Error(
      "Use either --all-groups or --group, not both\n\n" + HELP_TEXT
    );
  }

  return {
    email,
    password,
    groupSlugs: [...new Set(groupSlugs)],
    grantAllGroups,
  };
}
