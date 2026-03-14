const BUILDING_MARKERS = [
  "Deployment is building",
  "This page will update once the build completes.",
];

const DEFAULT_READY_MARKER = "ADMIN LOGIN";

export function getPreviewReadinessIssue(
  html: string,
  readyMarker = DEFAULT_READY_MARKER
) {
  for (const marker of BUILDING_MARKERS) {
    if (html.includes(marker)) {
      return `Preview still shows Vercel build interstitial: ${marker}`;
    }
  }

  if (!html.includes(readyMarker)) {
    return `Preview did not include expected readiness marker: ${readyMarker}`;
  }

  return null;
}

export function isPreviewPageReady(
  html: string,
  readyMarker = DEFAULT_READY_MARKER
) {
  return getPreviewReadinessIssue(html, readyMarker) === null;
}
