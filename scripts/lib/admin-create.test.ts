import { describe, expect, it } from "vitest";

import {
  getCreateAdminHelpText,
  parseCreateAdminArgs,
} from "./admin-create-args";

describe("parseCreateAdminArgs", () => {
  it("parses email and password only", () => {
    expect(parseCreateAdminArgs(["owner@example.com", "secret"])).toEqual({
      email: "owner@example.com",
      password: "secret",
      groupSlugs: [],
      grantAllGroups: false,
    });
  });

  it("parses repeated group flags and deduplicates slugs", () => {
    expect(
      parseCreateAdminArgs([
        "owner@example.com",
        "secret",
        "--group",
        "club-night",
        "--group",
        "cash-game",
        "--group",
        "club-night",
      ])
    ).toEqual({
      email: "owner@example.com",
      password: "secret",
      groupSlugs: ["club-night", "cash-game"],
      grantAllGroups: false,
    });
  });

  it("parses all groups flag", () => {
    expect(
      parseCreateAdminArgs(["owner@example.com", "secret", "--all-groups"])
    ).toEqual({
      email: "owner@example.com",
      password: "secret",
      groupSlugs: [],
      grantAllGroups: true,
    });
  });

  it("rejects missing credentials", () => {
    expect(() => parseCreateAdminArgs(["owner@example.com"])).toThrow(
      /Email and password are required/
    );
  });

  it("rejects mixing all groups and specific groups", () => {
    expect(() =>
      parseCreateAdminArgs([
        "owner@example.com",
        "secret",
        "--all-groups",
        "--group",
        "club-night",
      ])
    ).toThrow(/either --all-groups or --group/);
  });

  it("returns usage for help", () => {
    expect(() => parseCreateAdminArgs(["--help"])).toThrow(
      getCreateAdminHelpText()
    );
  });
});
