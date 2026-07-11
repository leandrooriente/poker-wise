import { createHash } from "node:crypto";

export type MigrationScalar = string | number | null;
export type MigrationRow = Record<string, MigrationScalar>;

export interface MigrationTableDefinition {
  name: string;
  columns: readonly string[];
  keyColumns: readonly string[];
  numericColumns: readonly string[];
  postgresQuery: string;
}

const epochMillisecondsExpression = (column: string) =>
  `ROUND(EXTRACT(EPOCH FROM (${column} AT TIME ZONE 'UTC')) * 1000)::double precision`;
const epochMilliseconds = (column: string) =>
  `${epochMillisecondsExpression(column)} AS ${column}`;
const nullableEpochMilliseconds = (column: string) =>
  `CASE WHEN ${column} IS NULL THEN NULL ELSE ${epochMillisecondsExpression(column)} END AS ${column}`;

export const MIGRATION_TABLES: readonly MigrationTableDefinition[] = [
  {
    name: "admins",
    columns: ["id", "email", "password_hash", "created_at"],
    keyColumns: ["id"],
    numericColumns: ["created_at"],
    postgresQuery: `
      SELECT id::text AS id, email, password_hash,
             ${epochMilliseconds("created_at")}
      FROM admins
      ORDER BY id
    `,
  },
  {
    name: "groups",
    columns: ["id", "name", "slug", "created_by_admin_id", "created_at"],
    keyColumns: ["id"],
    numericColumns: ["created_at"],
    postgresQuery: `
      SELECT id::text AS id, name, slug,
             created_by_admin_id::text AS created_by_admin_id,
             ${epochMilliseconds("created_at")}
      FROM groups
      ORDER BY id
    `,
  },
  {
    name: "group_admins",
    columns: ["group_id", "admin_id", "role", "created_at"],
    keyColumns: ["group_id", "admin_id"],
    numericColumns: ["created_at"],
    postgresQuery: `
      SELECT group_id::text AS group_id, admin_id::text AS admin_id, role,
             ${epochMilliseconds("created_at")}
      FROM group_admins
      ORDER BY group_id, admin_id
    `,
  },
  {
    name: "players",
    columns: ["id", "group_id", "name", "notes", "created_at"],
    keyColumns: ["id"],
    numericColumns: ["created_at"],
    postgresQuery: `
      SELECT id::text AS id, group_id::text AS group_id, name, notes,
             ${epochMilliseconds("created_at")}
      FROM players
      ORDER BY id
    `,
  },
  {
    name: "matches",
    columns: [
      "id",
      "group_id",
      "title",
      "buy_in_amount",
      "status",
      "started_at",
      "ended_at",
      "created_by_admin_id",
      "created_at",
    ],
    keyColumns: ["id"],
    numericColumns: ["buy_in_amount", "started_at", "ended_at", "created_at"],
    postgresQuery: `
      SELECT id::text AS id, group_id::text AS group_id, title, buy_in_amount,
             status, ${epochMilliseconds("started_at")},
             ${nullableEpochMilliseconds("ended_at")},
             created_by_admin_id::text AS created_by_admin_id,
             ${epochMilliseconds("created_at")}
      FROM matches
      ORDER BY id
    `,
  },
  {
    name: "match_entries",
    columns: [
      "id",
      "match_id",
      "player_id",
      "buy_ins",
      "final_value",
      "cashed_out_at",
    ],
    keyColumns: ["id"],
    numericColumns: ["buy_ins", "final_value", "cashed_out_at"],
    postgresQuery: `
      SELECT id::text AS id, match_id::text AS match_id,
             player_id::text AS player_id, buy_ins, final_value,
             ${nullableEpochMilliseconds("cashed_out_at")}
      FROM match_entries
      ORDER BY id
    `,
  },
  {
    name: "group_share_tokens",
    columns: ["id", "group_id", "token_hash", "created_at", "revoked_at"],
    keyColumns: ["id"],
    numericColumns: ["created_at", "revoked_at"],
    postgresQuery: `
      SELECT id::text AS id, group_id::text AS group_id, token_hash,
             ${epochMilliseconds("created_at")},
             ${nullableEpochMilliseconds("revoked_at")}
      FROM group_share_tokens
      ORDER BY id
    `,
  },
];

export interface MigrationTableManifest {
  count: number;
  sha256: string;
}

export interface MigrationManifest {
  formatVersion: 1;
  source: "development" | "production";
  exportedAt: string;
  tables: Record<string, MigrationTableManifest>;
}

export function normalizeMigrationRows(
  definition: MigrationTableDefinition,
  sourceRows: Array<Record<string, unknown>>
): MigrationRow[] {
  const numericColumns = new Set(definition.numericColumns);

  return sourceRows.map((sourceRow) => {
    const row: MigrationRow = {};
    for (const column of definition.columns) {
      const value = sourceRow[column];
      if (value === null || value === undefined) {
        row[column] = null;
      } else if (numericColumns.has(column)) {
        const numericValue = Number(value);
        if (!Number.isSafeInteger(numericValue)) {
          throw new Error(
            `${definition.name}.${column} is not a safe integer: ${String(value)}`
          );
        }
        row[column] = numericValue;
      } else if (typeof value === "string") {
        row[column] = value;
      } else {
        throw new Error(
          `${definition.name}.${column} has unsupported type ${typeof value}`
        );
      }
    }
    return row;
  });
}

function compareRows(
  definition: MigrationTableDefinition,
  left: MigrationRow,
  right: MigrationRow
): number {
  for (const column of definition.keyColumns) {
    const comparison = String(left[column]).localeCompare(
      String(right[column])
    );
    if (comparison !== 0) return comparison;
  }
  return 0;
}

export function canonicalizeRows(
  definition: MigrationTableDefinition,
  rows: MigrationRow[]
): string {
  const orderedRows = [...rows]
    .sort((left, right) => compareRows(definition, left, right))
    .map((row) =>
      Object.fromEntries(
        definition.columns.map((column) => [column, row[column] ?? null])
      )
    );

  return JSON.stringify(orderedRows);
}

export function createTableManifest(
  definition: MigrationTableDefinition,
  rows: MigrationRow[]
): MigrationTableManifest {
  return {
    count: rows.length,
    sha256: createHash("sha256")
      .update(canonicalizeRows(definition, rows))
      .digest("hex"),
  };
}

export function toSqlLiteral(value: MigrationScalar): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Cannot export unsafe numeric value: ${String(value)}`);
    }
    return String(value);
  }
  if (value.includes("\0")) {
    throw new Error("NUL characters cannot be represented in a D1 SQL import.");
  }
  return `'${value.replaceAll("'", "''")}'`;
}

export function createInsertStatements(
  definition: MigrationTableDefinition,
  rows: MigrationRow[]
): string[] {
  const columns = definition.columns
    .map((column) => `"${column}"`)
    .join(", ");
  return rows.map((row) => {
    const values = definition.columns
      .map((column) => toSqlLiteral(row[column] ?? null))
      .join(", ");
    return `INSERT INTO "${definition.name}" (${columns}) VALUES (${values});`;
  });
}
