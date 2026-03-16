/* eslint-disable no-console */import { seedScenario, type ScenarioName } from "./lib/scenarios";

async function main() {
  const scenario = process.argv[2] as ScenarioName;
  if (!scenario) {
    console.error("Usage: npm run db:seed -- <scenario>");
    console.error("Available scenarios: empty, basic-group, live-match, history, full-demo");
    process.exit(1);
  }

  console.log(`Seeding scenario: ${scenario}`);
  await seedScenario(scenario);
  console.log("Scenario seeded successfully.");
}

main().catch((err) => {
  console.error("Failed to seed scenario:", err);
  process.exit(1);
});