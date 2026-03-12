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
    // Numbers are converted to letters to match form validation (no numbers allowed)
    // The final .replace(/[^a-z-]/g, "-") also removes the "2" in "e2e-"
    expect(first).toContain("e-e-ccjfdcjgade-cjfbfdec-b-");
    expect(second).toContain("e-e-ccjfdcjgade-cjfbfdec-b-");
  });

  it("creates unique namespaces outside CI", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CI;
    delete process.env.GITHUB_RUN_ID;
    delete process.env.GITHUB_SHA;
    delete process.env.GITHUB_RUN_ATTEMPT;

    const first = generateNamespace();
    const second = generateNamespace();

    expect(first).not.toBe(second);
    expect(first.startsWith("local-")).toBe(true);
    expect(second.startsWith("local-")).toBe(true);
  });
});
