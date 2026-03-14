import { getPreviewReadinessIssue } from "./lib/vercel-preview-ready";

const baseUrl = process.env.BASE_URL;
const readyPath = process.env.PREVIEW_READY_PATH || "/login";
const readyMarker = process.env.PREVIEW_READY_MARKER || "ADMIN LOGIN";
const timeoutMs = Number(process.env.PREVIEW_READY_TIMEOUT_MS || 120000);
const intervalMs = Number(process.env.PREVIEW_READY_INTERVAL_MS || 5000);

if (!baseUrl) {
  throw new Error("Missing BASE_URL for preview readiness check.");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const targetUrl = new URL(readyPath, baseUrl).toString();
  const startedAt = Date.now();
  let attempts = 0;
  let lastIssue = "No response received yet.";

  while (Date.now() - startedAt <= timeoutMs) {
    attempts += 1;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "cache-control": "no-cache",
        },
      });
      const html = await response.text();

      if (!response.ok) {
        lastIssue = `Received HTTP ${response.status} from ${targetUrl}`;
      } else {
        const issue = getPreviewReadinessIssue(html, readyMarker);
        if (!issue) {
          console.log(
            `Preview responded with ready content after ${attempts} attempt(s): ${targetUrl}`
          );
          return;
        }

        lastIssue = issue;
      }
    } catch (error) {
      lastIssue = error instanceof Error ? error.message : String(error);
    }

    console.log(`Preview not ready yet (attempt ${attempts}): ${lastIssue}`);
    await sleep(intervalMs);
  }

  throw new Error(
    `Preview did not become ready within ${timeoutMs}ms. Last issue: ${lastIssue}`
  );
}

void main();
