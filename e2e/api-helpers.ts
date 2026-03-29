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
  const response = await page.request.post(
    `${testBaseUrl}/api/admin/groups/${groupSlug}/players`,
    {
      data: { name, notes },
    }
  );
  const text = await response.text();
  if (!response.ok()) {
    throw new Error(`Failed to create player: ${response.status()} ${text}`);
  }
  return JSON.parse(text);
}

export async function createGroupViaApi(
  page: Page,
  groupSlug: string,
  groupName: string = groupSlug
): Promise<{
  id: string;
  name: string;
  createdAt: string;
}> {
  const response = await page.request.post(`${testBaseUrl}/api/admin/groups`, {
    data: { id: groupSlug, name: groupName },
  });
  const text = await response.text();
  if (!response.ok()) {
    throw new Error(`Failed to create group: ${response.status()} ${text}`);
  }
  return JSON.parse(text);
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
    buyInAmount: number;
    players: Array<{
      userId: string;
      buyIns: number;
      finalValue: number;
      cashedOutAt?: string;
    }>;
    startedAt?: string;
    createdAt?: string;
    endedAt?: string;
    status?: string;
  }
): Promise<{
  id: string;
  title?: string;
  buyInAmount: number;
  startedAt: string;
  createdAt: string;
}> {
  const response = await page.request.post(
    `${testBaseUrl}/api/admin/groups/${groupSlug}/matches`,
    {
      data: {
        title: options.title,
        buyInAmount: options.buyInAmount,
        players: options.players,
        startedAt: options.startedAt || new Date().toISOString(),
        createdAt: options.createdAt,
        endedAt: options.endedAt,
        status: options.status || "live",
      },
    }
  );
  const text = await response.text();
  if (!response.ok()) {
    throw new Error(`Failed to create match: ${response.status()} ${text}`);
  }
  return JSON.parse(text);
}

/**
 * Get active group slug from session API.
 */
export async function getActiveGroupSlug(page: Page): Promise<string> {
  const response = await page.request.get(
    `${testBaseUrl}/api/admin/active-group`
  );
  if (!response.ok()) {
    throw new Error(`Failed to fetch active group: ${response.status()}`);
  }
  const data = await response.json();
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
  const response = await page.request.put(
    `${testBaseUrl}/api/admin/active-group`,
    {
      data: { slug },
    }
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to set active group: ${response.status()} ${await response.text()}`
    );
  }
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
      id: string;
      name: string;
      notes?: string;
      preferredBuyIn?: number;
      createdAt: string;
    }>;
    matches?: Array<{
      id: string;
      title?: string;
      buyInAmount: number;
      status?: string;
      players: Array<{
        userId: string;
        buyIns: number;
        finalValue: number;
        cashedOutAt?: string;
      }>;
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
  if (options.matches) {
    for (const seededMatch of options.matches) {
      const players = seededMatch.players.map((player) => ({
        userId: playerIdMap[player.userId] || player.userId,
        buyIns: player.buyIns,
        finalValue: player.finalValue,
        cashedOutAt: player.cashedOutAt,
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

  return { playerIdMap, matchIdMap };
}
