import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

let userMap: Record<string, string> = {};
let lastFetch = 0;
const CACHE_TTL = 30 * 60 * 1000;

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
        newMap[u.person.email.toLowerCase()] = u.id;
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  userMap = newMap;
  lastFetch = Date.now();
}

export async function getNotionUserId(email: string): Promise<string | null> {
  if (!email) return null;
  const key = email.toLowerCase().trim();
  if (Date.now() - lastFetch > CACHE_TTL || !userMap[key]) {
    try { await refreshUserMap(); } catch (e) { console.warn("[notion-users] refresh failed", e); }
  }
  return userMap[key] || null;
}
