import dotenv from "dotenv";

import {
  getCreateAdminHelpText,
  parseCreateAdminArgs,
} from "./lib/admin-create-args";

dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local", override: false });
dotenv.config({ override: false });

async function main() {
  const { createAdminWithAccess } = await import("./lib/admin-create");

  const parsed = parseCreateAdminArgs(process.argv.slice(2));
  const result = await createAdminWithAccess({
    email: parsed.email,
    password: parsed.password,
    groupSlugs: parsed.groupSlugs,
    grantAllGroups: parsed.grantAllGroups,
    role: "admin",
  });

  console.log(`Admin created: ${result.email}`);
  if (result.grantedGroupSlugs.length === 0) {
    console.log("No group access granted.");
    console.log(
      "Use --group <slug> or --all-groups if this admin should manage groups."
    );
    return;
  }

  console.log(
    `Granted admin access to: ${result.grantedGroupSlugs.join(", ")}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const exitCode = message.includes("Usage:") ? 0 : 1;
  console.error(message);
  if (!message.includes("Usage:")) {
    console.error("\n" + getCreateAdminHelpText());
  }
  process.exit(exitCode);
});
