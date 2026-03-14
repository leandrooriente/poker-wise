import { describe, expect, it } from "vitest";

import {
  getPreviewReadinessIssue,
  isPreviewPageReady,
} from "./vercel-preview-ready";

describe("vercel preview readiness", () => {
  it("marks the app login page as ready", () => {
    const html = `
      <html>
        <body>
          <h1>ADMIN LOGIN</h1>
        </body>
      </html>
    `;

    expect(isPreviewPageReady(html)).toBe(true);
    expect(getPreviewReadinessIssue(html)).toBeNull();
  });

  it("detects the Vercel build interstitial", () => {
    const html = `
      <html>
        <body>
          <h1>Deployment is building</h1>
          <p>This page will update once the build completes.</p>
        </body>
      </html>
    `;

    expect(isPreviewPageReady(html)).toBe(false);
    expect(getPreviewReadinessIssue(html)).toMatch(/building/i);
  });

  it("requires the expected readiness marker", () => {
    const html = `
      <html>
        <body>
          <h1>Poker Wise</h1>
        </body>
      </html>
    `;

    expect(isPreviewPageReady(html)).toBe(false);
    expect(getPreviewReadinessIssue(html)).toMatch(/ADMIN LOGIN/);
  });
});
