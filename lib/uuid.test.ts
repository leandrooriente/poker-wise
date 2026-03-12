import { afterEach, describe, expect, it, vi } from "vitest";

import { generateId } from "./uuid";

describe("generateId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "123e4567-e89b-42d3-a456-426614174000"),
    });

    expect(generateId()).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("falls back to a v4-shaped id when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(generateId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
