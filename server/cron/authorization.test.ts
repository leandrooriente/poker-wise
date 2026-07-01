import { describe, expect, it } from "vitest";

import { authorizeCronRequest } from "./authorization";

function requestWithAuthorization(authorization?: string) {
  const headers = new Headers();

  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }

  return new Request("https://example.com/api/keepalive", { headers });
}

describe("authorizeCronRequest", () => {
  it("allows requests when CRON_SECRET is not configured", () => {
    expect(authorizeCronRequest(requestWithAuthorization(), undefined)).toEqual(
      {
        authorized: true,
      }
    );
  });

  it("allows requests when CRON_SECRET is blank", () => {
    expect(authorizeCronRequest(requestWithAuthorization(), "   ")).toEqual({
      authorized: true,
    });
  });

  it("allows requests with a matching bearer token", () => {
    expect(
      authorizeCronRequest(
        requestWithAuthorization("Bearer expected-secret"),
        "expected-secret"
      )
    ).toEqual({ authorized: true });
  });

  it("rejects requests without a bearer token when CRON_SECRET is configured", () => {
    expect(
      authorizeCronRequest(requestWithAuthorization(), "expected-secret")
    ).toEqual({
      authorized: false,
    });
  });

  it("rejects requests with the wrong bearer token", () => {
    expect(
      authorizeCronRequest(
        requestWithAuthorization("Bearer wrong-secret"),
        "expected-secret"
      )
    ).toEqual({ authorized: false });
  });
});
