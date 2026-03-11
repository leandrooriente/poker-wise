import { afterEach, describe, expect, it, vi } from "vitest";

import { generateNamespace } from "../e2e/helpers";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("generateNamespace", () => {
  it("creates unique namespaces across repeated CI calls", () => {
    process.env = {
      ...ORIGINAL_ENV,
      CI: "true",
      GITHUB_RUN_ID: "22953296034",
      GITHUB_SHA: "2951f342abcd1234",
      GITHUB_RUN_ATTEMPT: "1",
    };

    const first = generateNamespace();
    const second = generateNamespace();

    expect(first).not.toBe(second);
    expect(first).toContain("e2e-22953296034-2951f342-1-");
    expect(second).toContain("e2e-22953296034-2951f342-1-");
  });

  it("creates unique namespaces outside CI", () => {
    process.env = { ...ORIGINAL_ENV };

    const first = generateNamespace();
    const second = generateNamespace();

    expect(first).not.toBe(second);
    expect(first.startsWith("local-")).toBe(true);
    expect(second.startsWith("local-")).toBe(true);
  });
});
