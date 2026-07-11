/* eslint-disable no-console */
import { createAdminWithAccess } from "./lib/admin-create";
import {
  getCreateAdminHelpText,
  parseCreateAdminArgs,
} from "./lib/admin-create-args";
import { parseScriptDatabaseOptions, withScriptDatabase } from "./lib/d1";

async function main() {
  const args = process.argv.slice(2);
  const databaseOptions = parseScriptDatabaseOptions(args);
  const adminArgs = args.filter(
    (arg) => arg !== "--remote" && arg !== "--env=production"
  );
  const parsed = parseCreateAdminArgs(adminArgs);

  const result = await withScriptDatabase(
    (database) =>
      createAdminWithAccess(
        {
          email: parsed.email,
          password: parsed.password,
          groupSlugs: parsed.groupSlugs,
          grantAllGroups: parsed.grantAllGroups,
          role: "admin",
        },
        database
      ),
    databaseOptions
  );

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
