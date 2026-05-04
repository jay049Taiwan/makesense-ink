import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

let userMap: Record<string, string> = {};
let lastFetch = 0;
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Normalize email for matching.
 * - lowercase + trim
 * - Gmail: strip dots in local part + strip +suffix
 *   (Google treats jay049@gmail.com / jay.049@gmail.com / jay049+x@gmail.com 為同一人)
 * - 也適用 @googlemail.com
 */
export function normalizeForMatch(email: string): string {
  if (!email) return "";
  const lower = email.toLowerCase().trim();
  const at = lower.indexOf("@");
  if (at < 0) return lower;
  let local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }
  return lower;
}

async function refreshUserMap() {
  const newMap: Record<string, string> = {};
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.users.list({
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const u of res.results) {
      if (u.type === "person" && u.person?.email) {
        newMap[normalizeForMatch(u.person.email)] = u.id;
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  userMap = newMap;
  lastFetch = Date.now();
}

export async function getNotionUserId(email: string): Promise<string | null> {
  if (!email) return null;
  const key = normalizeForMatch(email);
  if (Date.now() - lastFetch > CACHE_TTL || !userMap[key]) {
    try { await refreshUserMap(); } catch (e) { console.warn("[notion-users] refresh failed", e); }
  }
  return userMap[key] || null;
}
