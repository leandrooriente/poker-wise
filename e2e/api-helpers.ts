import { Page } from "@playwright/test";

const testPort = process.env.PORT || "3001";
const testBaseUrl = process.env.BASE_URL || `http://localhost:${testPort}`;

/**
 * Create a player via API.
 * Assumes the page is already authenticated (admin session).
 */
export async function createPlayerViaApi(
  page: Page,
  groupSlug: string,
  name: string,
  notes?: string
): Promise<{
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
}> {
  return await page.evaluate(
    async ({ baseUrl, groupSlug, name, notes }) => {
      const response = await fetch(
        `${baseUrl}/api/admin/groups/${groupSlug}/players`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, notes }),
        }
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to create player: ${response.status} ${text}`);
      }
      return JSON.parse(text);
    },
    { baseUrl: testBaseUrl, groupSlug, name, notes }
  );
}

/**
 * Create a match via API.
 * Assumes the page is already authenticated (admin session).
 */
export async function createMatchViaApi(
  page: Page,
  groupSlug: string,
  options: {
    title?: string;
    buyInAmount: number; // cents
    players: Array<{ userId: string; buyIns: number; finalValue: number }>;
    startedAt?: string; // ISO string
    createdAt?: string; // ISO string
    endedAt?: string; // ISO string
    status?: string; // default "live"
  }
): Promise<{
  id: string;
  title?: string;
  buyInAmount: number;
  startedAt: string;
  createdAt: string;
}> {
  return await page.evaluate(
    async ({ baseUrl, groupSlug, options }) => {
      const response = await fetch(
        `${baseUrl}/api/admin/groups/${groupSlug}/matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: options.title,
            buyInAmount: options.buyInAmount,
            players: options.players,
            startedAt: options.startedAt || new Date().toISOString(),
            createdAt: options.createdAt,
            endedAt: options.endedAt,
            status: options.status || "live",
          }),
        }
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to create match: ${response.status} ${text}`);
      }
      return JSON.parse(text);
    },
    { baseUrl: testBaseUrl, groupSlug, options }
  );
}

/**
 * Get active group slug from session API.
 */
export async function getActiveGroupSlug(page: Page): Promise<string> {
  const data = await page.evaluate(
    async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/admin/active-group`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch active group: ${response.status}`);
      }
      return response.json();
    },
    { baseUrl: testBaseUrl }
  );
  if (!data.activeGroupSlug) {
    throw new Error("No active group set for E2E player management");
  }
  return data.activeGroupSlug;
}

/**
 * Set active group via API.
 */
export async function setActiveGroupSlug(
  page: Page,
  slug: string | null
): Promise<void> {
  await page.evaluate(
    async ({ baseUrl, slug }) => {
      const response = await fetch(`${baseUrl}/api/admin/active-group`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to set active group: ${response.status} ${await response.text()}`
        );
      }
    },
    { baseUrl: testBaseUrl, slug }
  );
}

/**
 * Seed test data via API (replacement for seedNamespacedLocalStorage).
 * Creates players and matches in the given group slug.
 * Returns mapping of seeded player IDs to real player IDs.
 */
export async function seedViaApi(
  page: Page,
  groupSlug: string,
  options: {
    players?: Array<{
      id: string; // seeded ID (e.g., "p1")
      name: string;
      notes?: string;
      preferredBuyIn?: number;
      createdAt: string;
    }>;
    matches?: Array<{
      id: string; // seeded match ID
      title?: string;
      buyInAmount: number;
      status?: string;
      players: Array<{ userId: string; buyIns: number; finalValue: number }>;
      startedAt: string;
      createdAt: string;
    }>;
    settings?: { defaultBuyIn: number };
  }
): Promise<{
  playerIdMap: Record<string, string>;
  matchIdMap: Record<string, string>;
}> {
  const playerIdMap: Record<string, string> = {};
  // Create players
  if (options.players) {
    for (const seededPlayer of options.players) {
      const realPlayer = await createPlayerViaApi(
        page,
        groupSlug,
        seededPlayer.name,
        seededPlayer.notes
      );
      playerIdMap[seededPlayer.id] = realPlayer.id;
    }
  }

  const matchIdMap: Record<string, string> = {};
  // Create matches (need to map seeded userIds to real player IDs)
  if (options.matches) {
    for (const seededMatch of options.matches) {
      const players = seededMatch.players.map((p) => ({
        userId: playerIdMap[p.userId] || p.userId, // if mapping not found, assume real ID
        buyIns: p.buyIns,
        finalValue: p.finalValue,
      }));
      const realMatch = await createMatchViaApi(page, groupSlug, {
        title: seededMatch.title,
        buyInAmount: seededMatch.buyInAmount,
        players,
        startedAt: seededMatch.startedAt,
        createdAt: seededMatch.createdAt,
        status: seededMatch.status || "live",
      });
      matchIdMap[seededMatch.id] = realMatch.id;
    }
  }

  // Settings (default buy-in) is stored per-group in database (future feature)
  // For now, ignore.

  return { playerIdMap, matchIdMap };
}
