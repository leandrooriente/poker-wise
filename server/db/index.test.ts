import { afterEach, describe, expect, it } from "vitest";

import { getDb, setProcessDatabase, type Database } from "./index";

describe("database context", () => {
  afterEach(() => {
    setProcessDatabase(undefined);
  });

  it("uses an explicitly installed script or test database", () => {
    const database = { marker: "test-db" } as unknown as Database;

    setProcessDatabase(database);

    expect(getDb()).toBe(database);
  });
});
