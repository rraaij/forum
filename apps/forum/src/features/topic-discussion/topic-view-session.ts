/*
 * Browser-session identity for topic view deduplication (plan section 4.4).
 * One UUID per browser session, stored in sessionStorage. Only ever called
 * after a successful client render (onMount) — SSR never touches
 * sessionStorage.
 */

const STORAGE_KEY = "forum.browser-session-id";

export function getBrowserSessionId(): string {
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
