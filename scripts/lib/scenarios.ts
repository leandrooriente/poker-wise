import * as f from "./seed-factories";

/* eslint-disable no-console */import { db } from "@/server/db";
import { admins } from "@/server/db/schema";

export async function seedEmpty() {
  console.log("Seeding empty scenario (admin only)...");
  // admin already bootstrapped, nothing else to seed
}

export async function seedBasicGroup() {
  console.log("Seeding basic-group scenario...");
  const admin = await db.query.admins.findFirst();
  if (!admin) throw new Error("No admin found. Run bootstrap first.");

  const group = await f.createGroup("Friday Night Poker", "friday-night", admin.id);
  await f.addGroupAdmin(group.id, admin.id);

  const players = [
    await f.createPlayer(group.id, "Alice"),
    await f.createPlayer(group.id, "Bob"),
    await f.createPlayer(group.id, "Charlie"),
    await f.createPlayer(group.id, "Diana"),
  ];

  const { rawToken } = await f.createShareToken(group.id);
  console.log(`Public share token: ${rawToken}`);

  return { admin, group, players, shareToken: rawToken };
}

export async function seedLiveMatch() {
  console.log("Seeding live-match scenario...");
  const { admin, group, players } = await seedBasicGroup();

  const match = await f.createMatch(group.id, admin.id, {
    title: "Weekly Game",
    buyInAmount: 1000,
    status: "live",
    startedAt: new Date(),
  });

  // Each player starts with 1 buy-in
  for (const player of players) {
    await f.createMatchEntry(match.id, player.id, 1, 0);
  }

  // Add some rebuys
  await f.createMatchEntry(match.id, players[0].id, 2, 0); // Alice rebought once extra
  await f.createMatchEntry(match.id, players[2].id, 2, 0); // Charlie rebought once extra

  return { admin, group, players, match };
}

export async function seedHistory() {
  console.log("Seeding history scenario...");
  const { admin, group, players } = await seedBasicGroup();

  // Create three finished matches with different dates
  const match1 = await f.createMatch(group.id, admin.id, {
    title: "March Match",
    buyInAmount: 1500,
    status: "settled",
    startedAt: new Date("2025-03-01T19:00:00Z"),
    endedAt: new Date("2025-03-01T23:00:00Z"),
  });

  const match2 = await f.createMatch(group.id, admin.id, {
    title: "April Match",
    buyInAmount: 1000,
    status: "settled",
    startedAt: new Date("2025-04-05T20:00:00Z"),
    endedAt: new Date("2025-04-06T01:00:00Z"),
  });

  const match3 = await f.createMatch(group.id, admin.id, {
    title: "May Match",
    buyInAmount: 2000,
    status: "settled",
    startedAt: new Date("2025-05-10T18:00:00Z"),
    endedAt: new Date("2025-05-10T22:30:00Z"),
  });

  // Add realistic entries with final values
  // Match 1
  await f.createMatchEntry(match1.id, players[0].id, 1, 1800);
  await f.createMatchEntry(match1.id, players[1].id, 2, 2400);
  await f.createMatchEntry(match1.id, players[2].id, 1, 900);
  await f.createMatchEntry(match1.id, players[3].id, 1, 900);

  // Match 2
  await f.createMatchEntry(match2.id, players[0].id, 1, 1100);
  await f.createMatchEntry(match2.id, players[1].id, 1, 900);
  await f.createMatchEntry(match2.id, players[2].id, 2, 2200);
  await f.createMatchEntry(match2.id, players[3].id, 1, 800);

  // Match 3
  await f.createMatchEntry(match3.id, players[0].id, 2, 4500);
  await f.createMatchEntry(match3.id, players[1].id, 1, 1500);
  await f.createMatchEntry(match3.id, players[2].id, 1, 2000);
  await f.createMatchEntry(match3.id, players[3].id, 2, 4000);

  return { admin, group, players, matches: [match1, match2, match3] };
}

export async function seedFullDemo() {
  console.log("Seeding full-demo scenario...");
  const { admin, group, players } = await seedBasicGroup();

  // Live match
  const liveMatch = await f.createMatch(group.id, admin.id, {
    title: "Live Demo Match",
    buyInAmount: 1000,
    status: "live",
  });
  for (const player of players) {
    await f.createMatchEntry(liveMatch.id, player.id, 1, 0);
  }
  await f.createMatchEntry(liveMatch.id, players[0].id, 2, 0);
  await f.createMatchEntry(liveMatch.id, players[2].id, 2, 0);

  // Two historical matches
  const pastMatch1 = await f.createMatch(group.id, admin.id, {
    title: "Previous Match",
    buyInAmount: 1500,
    status: "settled",
    startedAt: new Date(Date.now() - 86400000 * 7),
    endedAt: new Date(Date.now() - 86400000 * 7 + 4 * 3600000),
  });
  await f.createMatchEntry(pastMatch1.id, players[0].id, 1, 2000);
  await f.createMatchEntry(pastMatch1.id, players[1].id, 2, 2500);
  await f.createMatchEntry(pastMatch1.id, players[2].id, 1, 1000);
  await f.createMatchEntry(pastMatch1.id, players[3].id, 1, 1000);

  const pastMatch2 = await f.createMatch(group.id, admin.id, {
    title: "Older Match",
    buyInAmount: 1000,
    status: "settled",
    startedAt: new Date(Date.now() - 86400000 * 14),
    endedAt: new Date(Date.now() - 86400000 * 14 + 5 * 3600000),
  });
  await f.createMatchEntry(pastMatch2.id, players[0].id, 1, 1200);
  await f.createMatchEntry(pastMatch2.id, players[1].id, 1, 800);
  await f.createMatchEntry(pastMatch2.id, players[2].id, 2, 2200);
  await f.createMatchEntry(pastMatch2.id, players[3].id, 1, 800);

  return { admin, group, players, liveMatch, pastMatches: [pastMatch1, pastMatch2] };
}

export type ScenarioName = "empty" | "basic-group" | "live-match" | "history" | "full-demo";

export async function seedScenario(name: ScenarioName) {
  switch (name) {
    case "empty":
      return await seedEmpty();
    case "basic-group":
      return await seedBasicGroup();
    case "live-match":
      return await seedLiveMatch();
    case "history":
      return await seedHistory();
    case "full-demo":
      return await seedFullDemo();
    default:
      throw new Error(`Unknown scenario: ${name}`);
  }
}