/* eslint-disable */
import { Page } from "@playwright/test";

import { seedViaApi } from "./api-helpers";

type SeedOptions = {
  players?: Array<{
    id: string;
    name: string;
    notes?: string;
    preferredBuyIn?: number;
    createdAt: string;
  }>;
  matches?: any[];
  settings?: { defaultBuyIn: number };
};

const pendingSeedByPage = new WeakMap<
  Page,
  { namespace: string; options: SeedOptions }
>();
const seedMappingsByPage = new WeakMap<
  Page,
  {
    playerIdMap: Record<string, string>;
    matchIdMap: Record<string, string>;
  }
>();
const activeGroupSlugByPage = new WeakMap<Page, string>();

// -----------------------------------------------------------------------------
// Namespace helpers for shard-safe test data
// -----------------------------------------------------------------------------

/**
 * Generate a unique namespace string for test data isolation.
 * Incorporates CI environment variables (run ID, SHA, shard) when available.
 * Falls back to timestamp + random string for local runs.
 * NOTE: Only generates letters and dashes (no numbers) to match form validation.
 */
export function generateNamespace(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);

  // In CI, use GitHub Actions context for stable, shard-aware namespacing
  if (process.env.CI) {
    const runId = process.env.GITHUB_RUN_ID || "ci";
    const sha = process.env.GITHUB_SHA
      ? process.env.GITHUB_SHA.substring(0, 8)
      : "unknown";
    const attempt = process.env.GITHUB_RUN_ATTEMPT || "1";

    // Convert numbers to letters to match form validation
    const numericRunId = runId.replace(
      /\d/g,
      (d) => "abcdefghijklmnopqrstuvwxyz"[parseInt(d) % 26]
    );
    const numericSha = sha.replace(
      /\d/g,
      (d) => "abcdefghijklmnopqrstuvwxyz"[parseInt(d) % 26]
    );
    const numericAttempt = attempt.replace(
      /\d/g,
      (d) => "abcdefghijklmnopqrstuvwxyz"[parseInt(d) % 26]
    );

    return `e2e-${numericRunId}-${numericSha}-${numericAttempt}-${timestamp}-${random}`.replace(
      /[^a-z-]/g,
      "-"
    );
  }

  // Local development: timestamp + random suffix (already letters only)
  return `local-${timestamp}-${random}`;
}

/**
 * Create a group with a namespace-unique name and slug.
 * Assumes the page is already on the groups page (admin logged in).
 * Returns the created group's slug.
 */
export async function createNamespacedGroup(
  page: Page,
  namespace: string
): Promise<string> {
  const groupSlug = `test-group-${namespace}`
    .toLowerCase()
    .replace(/[^a-z-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  await page.getByLabel("Group *").fill(groupSlug);

  await page.getByRole("button", { name: "CREATE GROUP" }).click();

  // Wait for group to appear in list (form now uses same value for name and slug)
  // Use a longer timeout to account for API calls and React state updates
  await expect(
    page.getByRole("heading", { name: groupSlug }).first()
  ).toBeVisible({ timeout: 10000 });

  const groupCard = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: groupSlug }).first() })
    .first();

  const selectButton = groupCard.getByRole("button", { name: "SELECT" });
  if (await selectButton.isVisible().catch(() => false)) {
    await selectButton.click();
  }

  await expect(groupCard.getByRole("button", { name: "ACTIVE" })).toBeVisible();

  // Active group is now set via session (SELECT button triggers API)
  return groupSlug;
}

/**
 * Log in as admin and create a namespaced group.
 * Returns an object with { namespace, groupSlug }.
 */
export async function loginAdminAndCreateNamespacedGroup(
  page: Page
): Promise<{ namespace: string; groupSlug: string }> {
  const namespace = generateNamespace();
  await loginAdmin(page);
  const groupSlug = await createNamespacedGroup(page, namespace);
  activeGroupSlugByPage.set(page, groupSlug);

   const pendingSeed = pendingSeedByPage.get(page);
   if (pendingSeed) {
    const mappings = await seedViaApi(page, groupSlug, pendingSeed.options);
    seedMappingsByPage.set(page, mappings);
    pendingSeedByPage.delete(page);
   }

  return { namespace, groupSlug };
}

/**
 * Seed localStorage with namespace-aware test data.
 * Creates a unique group ID based on namespace and seeds players/matches under that group.
 */
export async function seedNamespacedLocalStorage(
  page: Page,
  namespace: string,
  options: SeedOptions
) {
  const rememberedGroupSlug = activeGroupSlugByPage.get(page);
  if (rememberedGroupSlug) {
    const mappings = await seedViaApi(page, rememberedGroupSlug, options);
    seedMappingsByPage.set(page, mappings);
    pendingSeedByPage.delete(page);
    return;
  }

  try {
    await page.waitForSelector("#group-select", { timeout: 1_000 });
    const activeGroupSlug = await page.locator("#group-select").evaluate(
      (select) =>
        (select as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ||
        ""
    );
    if (activeGroupSlug) {
      const mappings = await seedViaApi(page, activeGroupSlug, options);
      seedMappingsByPage.set(page, mappings);
      pendingSeedByPage.delete(page);
      return;
    }
  } catch {
    // Ignore and fall back to API check or pending seed storage.
  }

  try {
    const response = await page.request.get("/api/admin/active-group");
    if (response.ok()) {
      const data = await response.json();
      if (data.activeGroupSlug) {
        const mappings = await seedViaApi(page, data.activeGroupSlug, options);
        seedMappingsByPage.set(page, mappings);
        pendingSeedByPage.delete(page);
        return;
      }
    }
  } catch {
    // Ignore and fall back to pending seed storage.
  }

  pendingSeedByPage.set(page, { namespace, options });
}

export function resolveSeededMatchId(page: Page, matchId: string) {
  return seedMappingsByPage.get(page)?.matchIdMap[matchId] ?? matchId;
}

// -----------------------------------------------------------------------------
// Existing helpers
// -----------------------------------------------------------------------------

/**
 * Log in as admin via UI.
 */
export async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("EMAIL").fill("admin@example.com");
  await page.getByLabel("PASSWORD").fill("changeme");
  await page.getByRole("button", { name: "LOGIN" }).click();
  // Wait for redirect to home page (groups page)
  await page.waitForURL("/");
  // Also wait for group management heading to be visible
  await page.waitForSelector('h2:has-text("GROUP MANAGEMENT")');
}

/**
 * Create a group via UI (must be on groups page).
 */
export async function createGroup(page: Page, id: string, name: string) {
  await page.getByLabel("Group *").fill(id || name);
  await page.getByRole("button", { name: "CREATE GROUP" }).click();
  await expect(
    page.getByRole("heading", { name: id || name }).first()
  ).toBeVisible();
}

export interface PlayerData {
  name: string;
  notes?: string;
}

/**
 * Get the currently active group slug from session API.
 */
async function getActiveGroupSlug(page: Page): Promise<string> {
  const response = await page.request.get("/api/admin/active-group");
  if (!response.ok()) {
    throw new Error(`Failed to fetch active group: ${response.status()}`);
  }
  const data = await response.json();
  if (!data.activeGroupSlug) {
    throw new Error("No active group set for E2E player management");
  }
  return data.activeGroupSlug;
}

export async function gotoActiveGroupPlayersPage(page: Page) {
  const activeGroupSlug = await getActiveGroupSlug(page);

  await page.goto(`/admin/groups/${activeGroupSlug}/players`);
  await expect(
    page.getByRole("heading", { name: "Players in Group" })
  ).toBeVisible();

  return activeGroupSlug;
}

export interface MatchSetup {
  players: string[]; // player names
  title?: string;
  buyIn?: number; // cents, default 1000 (10.00 EUR)
}

/**
 * Add a player via the UI on the players page
 */
export async function addPlayer(page: Page, data: PlayerData) {
  await gotoActiveGroupPlayersPage(page);
  await page.getByTestId("player-name-input").fill(data.name);

  await page.getByRole("button", { name: "ADD PLAYER" }).click();
  await expect(page.getByRole("heading", { name: data.name })).toBeVisible();
}

/**
 * Start a new match via UI
 */
export async function startMatch(page: Page, setup: MatchSetup) {
  await page.goto("/new-match");

  // Select players
  for (const playerName of setup.players) {
    await page.locator("label", { hasText: playerName }).click();
  }

  // Optional custom buy-in
  if (setup.buyIn !== undefined) {
    await page
      .getByTestId("buy-in-amount-input")
      .fill((setup.buyIn / 100).toFixed(2));
  }

  await page.getByRole("button", { name: "START MATCH" }).click();
  await expect(page.getByRole("heading", { name: "LIVE MATCH" })).toBeVisible();
}

/**
 * Add rebuys for a player in live match
 */
export async function addRebuy(
  page: Page,
  playerName: string,
  times: number = 1
) {
  const playerRow = page
    .getByTestId("player-row")
    .filter({ hasText: playerName });
  const buyInsSpan = playerRow.locator(
    "span.font-pixel.text-retro-yellow.text-2xl"
  );

  for (let i = 0; i < times; i++) {
    const buyInsText = await buyInsSpan.innerText();
    const currentBuyIns = Number(buyInsText);

    await playerRow.getByRole("button", { name: "REBUY" }).click();
    await expect(buyInsSpan).toHaveText(`${currentBuyIns + 1}`);
  }
}

/**
 * Get total pot value displayed in match info (as string, e.g. "30.00 EUR")
 */
export async function getTotalPotText(page: Page): Promise<string> {
  // Locate the "Total pot" label, then find the sibling span with class text-retro-green
  const totalPotLabel = page.getByText("Total pot");
  // The parent div contains two spans: label and value
  const totalPotRow = totalPotLabel.locator(".."); // the flex container div
  const value = totalPotRow.locator("span.font-pixel.text-retro-green");
  return await value.innerText();
}

/**
 * Fill cashout values for players
 * valuesByPlayerName: { [playerName]: amountInEuros }
 */
export async function fillCashoutValues(
  page: Page,
  valuesByPlayerName: Record<string, number>
) {
  for (const [playerName, amount] of Object.entries(valuesByPlayerName)) {
    // Find the player's border container by heading
    const heading = page.getByRole("heading", { name: playerName });
    // Wait for at least one matching heading to be attached
    await heading.first().waitFor({ state: "attached" });
    const playerSection = heading.locator("..").locator("..").locator("..");
    const input = playerSection.getByLabel("FINAL VALUE");
    await input.fill(amount.toFixed(2));
  }
}

/**
 * Navigate to history and open the latest match details
 */
export async function openLatestHistoryMatch(page: Page) {
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "MATCH HISTORY" })
  ).toBeVisible();

  // Click the first match entry (newest)
  await page.getByTestId("match-entry").first().click();
}

/**
 * Seed localStorage directly for test setup
 */
export async function seedLocalStorage(
  page: Page,
  options: {
    players?: Array<{
      id: string;
      name: string;
      notes?: string;
      preferredBuyIn?: number;
      createdAt: string;
    }>;
    matches?: any[];
    settings?: { defaultBuyIn: number };
  }
) {
  await page.addInitScript((opts) => {
    // Seed users in new storage key (poker-wise-users)
    if (opts.players) {
      const users = opts.players.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
      }));
      localStorage.setItem("poker-wise-users", JSON.stringify(users));
    }
    // Ensure default group exists
    const groups = [{ id: "home-game", createdAt: new Date().toISOString() }];
    localStorage.setItem("poker-wise-groups", JSON.stringify(groups));
    // Set active group
    localStorage.setItem("poker-wise-active-group", "home-game");

    // Ensure group memberships exist for seeded users
    if (opts.players) {
      const members = opts.players.map((p) => ({
        groupId: "home-game",
        userId: p.id,
        joinedAt: new Date().toISOString(),
      }));
      localStorage.setItem("poker-wise-group-members", JSON.stringify(members));
    }

    if (opts.matches) {
      // Convert legacy playerId to userId and add groupId if missing
      const convertedMatches = opts.matches.map((match) => ({
        ...match,
        groupId: match.groupId || "home-game",
        players: match.players.map((mp: any) => {
          const { playerId, ...rest } = mp;
          return {
            ...rest,
            userId: mp.userId || mp.playerId,
          };
        }),
      }));
      localStorage.setItem(
        "poker-wise-matches",
        JSON.stringify(convertedMatches)
      );
    }
    if (opts.settings) {
      localStorage.setItem(
        "poker-wise-settings",
        JSON.stringify(opts.settings)
      );
    }
  }, options);
}

// Re-export expect for convenience
import { expect } from "@playwright/test";
export { expect };
