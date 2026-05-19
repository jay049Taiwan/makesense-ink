/**
 * 一次性清理 DB08「關係對象」垃圾資料
 *
 * 背景：某個自動化曾持續灌入上萬筆英文垃圾資料（來源已停）。
 *
 * 用法：
 *   GET ?mode=report
 *     全量掃 DB08，分類統計 + 抽樣 + 來源（創建者/月份）分布，不動任何資料。
 *
 *   GET ?mode=archive&rule=conservative&confirm=DELETE-DB08-JUNK
 *     封存（移到 Notion 垃圾桶）符合規則的垃圾頁。可重複呼叫直到 remaining=0。
 *     垃圾桶 30 天內可救回；要永久刪除請事後在 Notion 垃圾桶手動清空。
 *
 * rule：
 *   conservative（預設）= 對象名稱不含中日韓字 且 經營類型空 且 無任何 relation
 *   whitelist           = 凡不在 Supabase 白名單、且對象名稱不含中日韓字者
 */
import { NextRequest, NextResponse } from "next/server";
import notion, { queryDatabase, DB } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

const TIME_BUDGET_MS = 270_000;
const ARCHIVE_CONCURRENCY = 8;

type Rule = "conservative" | "whitelist";

function analyze(page: any) {
  const props = page.properties || {};
  const titleArr = props["對象名稱"]?.title || [];
  const title = titleArr.map((x: any) => x.plain_text).join("").trim();
  const hasCJK = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/.test(title);
  const bizType = props["經營類型"]?.select?.name || null;
  const memberStatus = props["會員狀態"]?.status?.name || null;
  let relCount = 0;
  for (const k of Object.keys(props)) {
    const pr = props[k];
    if (pr?.type === "relation") relCount += (pr.relation || []).length;
  }
  return { title, hasCJK, bizType, memberStatus, relCount };
}

async function loadWhitelist(): Promise<Set<string>> {
  const set = new Set<string>();
  const tables = ["persons", "partners", "members", "staff", "topics"];
  for (const t of tables) {
    const { data } = await supabaseAdmin.from(t).select("notion_id");
    for (const row of data || []) {
      if (row?.notion_id) set.add(String(row.notion_id).replace(/-/g, ""));
    }
  }
  return set;
}

function isJunk(a: ReturnType<typeof analyze>, rule: Rule, whitelist: Set<string>, pageId: string) {
  if (a.hasCJK) return false; // 名稱含中日韓字 → 視為真實資料，永遠保留
  if (rule === "whitelist") {
    return !whitelist.has(pageId.replace(/-/g, ""));
  }
  // conservative
  return !a.bizType && a.relCount === 0;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "report";
  const rule = (searchParams.get("rule") as Rule) || "conservative";

  let pages: any[];
  try {
    pages = await queryDatabase(DB.DB08_RELATIONSHIP);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: `查詢 DB08 失敗：${err?.message || err}` }, { status: 500 });
  }

  const whitelist = mode === "report" || rule === "whitelist" ? await loadWhitelist() : new Set<string>();

  if (mode === "report") {
    let cjk = 0, noCJK = 0, hasBiz = 0, hasMember = 0, hasRel = 0;
    let junkConservative = 0, junkWhitelist = 0;
    const byCreator: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const sampleJunk: any[] = [];
    const sampleKeep: any[] = [];

    for (const page of pages) {
      const a = analyze(page);
      if (a.hasCJK) cjk++; else noCJK++;
      if (a.bizType) hasBiz++;
      if (a.memberStatus) hasMember++;
      if (a.relCount > 0) hasRel++;

      const jC = isJunk(a, "conservative", whitelist, page.id);
      const jW = isJunk(a, "whitelist", whitelist, page.id);
      if (jC) junkConservative++;
      if (jW) junkWhitelist++;

      if (jC || jW) {
        const creator = page.created_by?.id || "unknown";
        byCreator[creator] = (byCreator[creator] || 0) + 1;
        const month = (page.created_time || "").slice(0, 7) || "unknown";
        byMonth[month] = (byMonth[month] || 0) + 1;
        if (sampleJunk.length < 25) {
          sampleJunk.push({ id: page.id, title: a.title, bizType: a.bizType, relCount: a.relCount, created: page.created_time });
        }
      } else if (sampleKeep.length < 25) {
        sampleKeep.push({ id: page.id, title: a.title, bizType: a.bizType, relCount: a.relCount });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "report",
      total: pages.length,
      breakdown: {
        名稱含中日韓字: cjk,
        名稱純英數: noCJK,
        有經營類型: hasBiz,
        有會員狀態: hasMember,
        有任一relation: hasRel,
      },
      junk: {
        conservative_保守規則: junkConservative,
        whitelist_白名單規則: junkWhitelist,
        whitelist_白名單筆數: whitelist.size,
      },
      junk_byCreator: byCreator,
      junk_byMonth: byMonth,
      sampleJunk,
      sampleKeep,
      elapsedMs: Date.now() - start,
    });
  }

  if (mode === "archive") {
    if (searchParams.get("confirm") !== "DELETE-DB08-JUNK") {
      return NextResponse.json({ ok: false, error: "缺少 confirm=DELETE-DB08-JUNK" }, { status: 400 });
    }
    const targets = pages
      .filter((p) => isJunk(analyze(p), rule, whitelist, p.id))
      .map((p) => p.id);

    let archived = 0;
    const errors: string[] = [];
    for (let i = 0; i < targets.length; i += ARCHIVE_CONCURRENCY) {
      if (Date.now() - start > TIME_BUDGET_MS) break;
      const batch = targets.slice(i, i + ARCHIVE_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((id) => notion.pages.update({ page_id: id, archived: true }))
      );
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") archived++;
        else if (errors.length < 10) errors.push(`${batch[j]}: ${(results[j] as PromiseRejectedResult).reason?.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "archive",
      rule,
      matched: targets.length,
      archived,
      remaining: targets.length - archived,
      note: remainingNote(targets.length - archived),
      errors,
      elapsedMs: Date.now() - start,
    });
  }

  return NextResponse.json({ ok: false, error: `未知 mode：${mode}` }, { status: 400 });
}

function remainingNote(remaining: number) {
  return remaining > 0
    ? "尚有未處理，請再次呼叫同一網址（archived 的頁會自動退出查詢結果，重跑即繼續）。"
    : "已全部封存。要永久刪除請到 Notion 垃圾桶手動清空。";
}
