import { describe, expect, it } from "vitest";

import {
  canonicalizeRows,
  createInsertStatements,
  createTableManifest,
  normalizeMigrationRows,
  toSqlLiteral,
  type MigrationTableDefinition,
} from "./d1-migration";

const definition: MigrationTableDefinition = {
  name: "example",
  columns: ["id", "amount", "notes"],
  keyColumns: ["id"],
  numericColumns: ["amount"],
  postgresQuery: "SELECT 1",
};

describe("D1 migration helpers", () => {
  it("escapes SQL values without changing their contents", () => {
    expect(toSqlLiteral("O'Brien\nFriday")).toBe("'O''Brien\nFriday'");
    expect(toSqlLiteral(123)).toBe("123");
    expect(toSqlLiteral(null)).toBe("NULL");
    expect(() => toSqlLiteral("bad\0value")).toThrow(/NUL/);
  });

  it("normalizes numeric values and computes order-independent digests", () => {
    const left = normalizeMigrationRows(definition, [
      { id: "b", amount: "2", notes: null },
      { id: "a", amount: 1, notes: "one" },
    ]);
    const right = normalizeMigrationRows(definition, [
      { id: "a", amount: 1, notes: "one" },
      { id: "b", amount: 2, notes: null },
    ]);

    expect(canonicalizeRows(definition, left)).toBe(
      canonicalizeRows(definition, right)
    );
    expect(createTableManifest(definition, left)).toEqual(
      createTableManifest(definition, right)
    );
  });

  it("creates one auditable INSERT statement per row", () => {
    const rows = normalizeMigrationRows(definition, [
      { id: "row-1", amount: 10, notes: "safe ' text" },
    ]);

    expect(createInsertStatements(definition, rows)).toEqual([
      `INSERT INTO "example" ("id", "amount", "notes") VALUES ('row-1', 10, 'safe '' text');`,
    ]);
  });
});
