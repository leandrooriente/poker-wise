import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateId } from "@/lib/uuid";
import { createDatabase, setProcessDatabase, type Database } from "@/server/db";
import { createGroup } from "@/server/db/queries/groups";
import {
  createMatchForAdmin,
  listMatchesForGroupForAdmin,
  updateMatchForAdmin,
} from "@/server/db/queries/matches";
import { createPlayer } from "@/server/db/queries/players";
import { admins, groupAdmins, groups } from "@/server/db/schema";

let db: Database;

beforeEach(() => {
  db = createDatabase(env.DB);
  setProcessDatabase(db);
});

afterEach(() => {
  setProcessDatabase(undefined);
});

async function createAdmin() {
  const [admin] = await db
    .insert(admins)
    .values({
      id: generateId(),
      email: `${generateId()}@example.com`,
      passwordHash: "test-hash",
    })
    .returning();
  return admin;
}

describe("D1 database layer", () => {
  it("applies the schema, maps dates, and cascades group membership", async () => {
    const admin = await createAdmin();
    expect(admin.createdAt).toBeInstanceOf(Date);

    const group = await createGroup({
      id: `group-${generateId()}`,
      name: "D1 Group",
      createdByAdminId: admin.id,
    });

    expect(group.role).toBe("admin");
    expect(group.createdAt).toBeInstanceOf(Date);
    await expect(db.select().from(groupAdmins)).resolves.toHaveLength(1);

    await db.delete(groups).where(eq(groups.id, group.id));
    await expect(db.select().from(groupAdmins)).resolves.toEqual([]);

    const foreignKeyErrors = await db.all(sql`PRAGMA foreign_key_check`);
    expect(foreignKeyErrors).toEqual([]);
  });

  it("creates and replaces match entries with atomic D1 batches", async () => {
    const admin = await createAdmin();
    const group = await createGroup({
      id: `group-${generateId()}`,
      name: "Batch Group",
      createdByAdminId: admin.id,
    });
    const alice = await createPlayer(
      { groupId: group.id, name: "Alice" },
      admin.id
    );
    const bob = await createPlayer(
      { groupId: group.id, name: "Bob" },
      admin.id
    );
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    const created = await createMatchForAdmin(
      {
        groupId: group.id,
        buyInAmount: 1000,
        players: [
          { userId: alice!.id, buyIns: 1, finalValue: 0 },
          { userId: bob!.id, buyIns: 1, finalValue: 0 },
        ],
      },
      admin.id
    );
    expect(created?.players).toHaveLength(2);

    const updated = await updateMatchForAdmin(created!.id, admin.id, {
      players: [{ userId: alice!.id, buyIns: 2, finalValue: 0 }],
    });
    expect(updated?.players).toEqual([
      expect.objectContaining({ userId: alice!.id, buyIns: 2 }),
    ]);

    const listed = await listMatchesForGroupForAdmin(group.id, admin.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].players).toHaveLength(1);
  });
});
