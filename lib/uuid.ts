/**
 * Generate a random UUID v4.
 * Uses crypto.randomUUID() if available (modern browsers, Node 15+).
 * Falls back to a manual UUID v4 implementation.
 */
export function generateId(): string {
  // Prefer crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: generate a UUID v4 using random values
  // See https://stackoverflow.com/a/2117523
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}