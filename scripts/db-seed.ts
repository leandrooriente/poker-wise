/* eslint-disable no-console */
import { parseScriptDatabaseOptions, withScriptDatabase } from "./lib/d1";
import { seedScenario, type ScenarioName } from "./lib/scenarios";

async function main() {
  const args = process.argv.slice(2);
  const scenario = args.find((arg) => !arg.startsWith("--")) as
    | ScenarioName
    | undefined;
  if (!scenario) {
    console.error("Usage: npm run db:seed -- <scenario>");
    console.error(
      "Available scenarios: empty, basic-group, live-match, history, full-demo"
    );
    process.exit(1);
  }

  const options = parseScriptDatabaseOptions(args);
  if (options.environment === "production") {
    throw new Error("Scenario seeding is disabled for production.");
  }
  if (options.remote && !args.includes("--confirm-remote-dev")) {
    throw new Error(
      "Seeding remote development data requires --confirm-remote-dev."
    );
  }

  await withScriptDatabase(async () => {
    console.log(`Seeding scenario: ${scenario}`);
    await seedScenario(scenario);
    console.log("Scenario seeded successfully.");
  }, options);
}

main().catch((error) => {
  console.error("Failed to seed scenario:", error);
  process.exit(1);
});
