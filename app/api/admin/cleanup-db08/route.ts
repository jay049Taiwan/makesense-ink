/**
 * 一次性清理 DB08「關係對象」垃圾資料
 *
 * 金鑰：用 ?token=ntn_xxx 從網址帶入 Notion 金鑰（不依賴環境變數）。
 *
 * 模式：
 *   ?mode=report&token=...
 *     全量掃 DB08，分類統計 + 來源分布 + 抽樣。不動任何資料。
 *
 *   ?mode=list&token=...&offset=0&limit=50&filter=all|junk|keep
 *     依名稱正規化排序、標記重複組，每批回傳完整欄位供人工複核。
 *
 *   ?mode=archive&token=...&rule=conservative|whitelist&confirm=DELETE-DB08-JUNK
 *     批次封存垃圾頁（移至 Notion 垃圾桶，30 天可救回），可重複呼叫直到清完。
 */
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

const TIME_BUDGET_MS = 250_000;
const ARCHIVE_CONCURRENCY = 8;
const DB08_DATA_SOURCE_ID = "6934a808-b79b-4446-98dd-f699476408a0";

type Rule = "conservative" | "whitelist";

async function queryAll(client: Client): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    let resp: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        resp = await client.dataSources.query({
          data_source_id: DB08_DATA_SOURCE_ID,
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        } as any);
        break;
      } catch (err: any) {
        const status = err?.status || err?.code;
        const retryable = status === 502 || status === 504 || status === 429 ||
          err?.code === "notionhq_client_request_timeout";
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, [3000, 8000][attempt]));
          continue;
        }
        throw err;
      }
    }
    all.push(...(resp.results || []));
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return all;
}

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
  for (const t of ["persons", "partners", "members", "staff", "topics"]) {
    try {
      let from = 0;
      for (;;) {
        const { data } = await supabase.from(t).select("notion_id").range(from, from + 999);
        for (const row of data || []) {
          if (row?.notion_id) set.add(String(row.notion_id).replace(/-/g, ""));
        }
        if (!data || data.length < 1000) break;
        from += 1000;
      }
    } catch {
      /* 白名單載入失敗不致命 */
    }
  }
  return set;
}

function isJunk(a: ReturnType<typeof analyze>, rule: Rule, whitelist: Set<string>, pageId: string) {
  // whitelist 規則：不在 Supabase 名單內即為垃圾（不看名稱語言）
  if (rule === "whitelist") return !whitelist.has(pageId.replace(/-/g, ""));
  if (a.hasCJK) return false; // 保守規則：名稱含中日韓字 → 保留
  return !a.bizType && a.relCount === 0;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "report";
  const rule = (searchParams.get("rule") as Rule) || "conservative";
  const token = searchParams.get("token") || process.env.NOTION_API_KEY;

  if (!token) {
    return NextResponse.json({ ok: false, error: "缺少 token 參數" }, { status: 400 });
  }
  const client = new Client({ auth: token, timeoutMs: 120_000 });

  let pages: any[];
  try {
    pages = await queryAll(client);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `查詢 DB08 失敗：${err?.message || err}` },
      { status: 500 }
    );
  }

  const whitelist =
    mode === "report" || rule === "whitelist" ? await loadWhitelist() : new Set<string>();

  if (mode === "snapshot") {
    const rows = pages.map((p) => {
      const a = analyze(p);
      const props = p.properties || {};
      return {
        notion_id: p.id.replace(/-/g, ""),
        title: a.title,
        biz_type: a.bizType,
        member_status: a.memberStatus,
        rel_count: a.relCount,
        email: props["Email"]?.rich_text?.map((x: any) => x.plain_text).join("") || null,
        fb: props["FB粉專"]?.url || null,
        ig: props["IG粉專"]?.url || null,
        created_time: p.created_time || null,
        creator: p.created_by?.id || null,
        synonym: props["同義備註"]?.rich_text?.map((x: any) => x.plain_text).join("") || null,
        analysis_note: props["分析備註"]?.rich_text?.map((x: any) => x.plain_text).join("") || null,
        decision: null,
      };
    });
    await supabase.from("db08_cleanup").delete().neq("notion_id", "___none___");
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("db08_cleanup").insert(rows.slice(i, i + 500));
      if (error) {
        return NextResponse.json(
          { ok: false, error: `寫入 Supabase 失敗：${error.message}`, inserted },
          { status: 500 }
        );
      }
      inserted += Math.min(500, rows.length - i);
    }
    return NextResponse.json({
      ok: true,
      mode: "snapshot",
      total: pages.length,
      inserted,
      elapsedMs: Date.now() - start,
    });
  }

  if (mode === "report") {
    let cjk = 0, noCJK = 0, hasBiz = 0, hasMember = 0, hasRel = 0;
    let junkConservative = 0, junkWhitelist = 0;
    const byCreator: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const sampleJunk: any[] = [];
    const sampleKeep: any[] = [];

    // 全量分布
    const byBizType: Record<string, number> = {};
    const byMemberStatus: Record<string, number> = {};
    const allByCreator: Record<string, number> = {};
    const allByMonth: Record<string, number> = {};
    const norm = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "").trim();
    const titleCounts: Record<string, number> = {};

    for (const page of pages) {
      const a = analyze(page);
      if (a.hasCJK) cjk++; else noCJK++;
      if (a.bizType) hasBiz++;
      if (a.memberStatus) hasMember++;
      if (a.relCount > 0) hasRel++;

      byBizType[a.bizType || "（空）"] = (byBizType[a.bizType || "（空）"] || 0) + 1;
      byMemberStatus[a.memberStatus || "（空）"] = (byMemberStatus[a.memberStatus || "（空）"] || 0) + 1;
      const c = page.created_by?.id || "unknown";
      allByCreator[c] = (allByCreator[c] || 0) + 1;
      const m = (page.created_time || "").slice(0, 7) || "unknown";
      allByMonth[m] = (allByMonth[m] || 0) + 1;
      const nt = norm(a.title);
      if (nt) titleCounts[nt] = (titleCounts[nt] || 0) + 1;

      const jC = isJunk(a, "conservative", whitelist, page.id);
      const jW = isJunk(a, "whitelist", whitelist, page.id);
      if (jC) junkConservative++;
      if (jW) junkWhitelist++;

      if (jC || jW) {
        byCreator[c] = (byCreator[c] || 0) + 1;
        byMonth[m] = (byMonth[m] || 0) + 1;
        if (sampleJunk.length < 25)
          sampleJunk.push({ title: a.title, bizType: a.bizType, relCount: a.relCount, created: page.created_time });
      } else if (sampleKeep.length < 25) {
        sampleKeep.push({ title: a.title, bizType: a.bizType, relCount: a.relCount });
      }
    }

    // 重複統計
    let dupGroups = 0, recordsInGroups = 0;
    const topDup: { title: string; count: number }[] = [];
    for (const [t, n] of Object.entries(titleCounts)) {
      if (n > 1) {
        dupGroups++;
        recordsInGroups += n;
        topDup.push({ title: t, count: n });
      }
    }
    topDup.sort((a, b) => b.count - a.count);

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
      依經營類型: byBizType,
      依會員狀態: byMemberStatus,
      全量依建立者: allByCreator,
      全量依月份: allByMonth,
      重複統計: {
        重複組數: dupGroups,
        屬於重複組的總筆數: recordsInGroups,
        最重複前30名: topDup.slice(0, 30),
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

  if (mode === "list") {
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const filter = searchParams.get("filter") || "all";
    const norm = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "").trim();

    let rows = pages.map((page) => {
      const props = page.properties || {};
      const a = analyze(page);
      const relProps: string[] = [];
      for (const k of Object.keys(props)) {
        const pr = props[k];
        if (pr?.type === "relation" && (pr.relation || []).length) relProps.push(k);
      }
      return {
        id: page.id,
        url: page.url,
        title: a.title,
        normTitle: norm(a.title),
        hasCJK: a.hasCJK,
        bizType: a.bizType,
        relationOption: props["關係選項"]?.select?.name || null,
        memberStatus: a.memberStatus,
        email: props["Email"]?.rich_text?.map((x: any) => x.plain_text).join("") || null,
        fb: props["FB粉專"]?.url || null,
        ig: props["IG粉專"]?.url || null,
        relCount: a.relCount,
        relProps,
        created: page.created_time,
        isJunk: isJunk(a, rule, whitelist, page.id),
      };
    });

    if (filter === "junk") rows = rows.filter((r) => r.isJunk);
    else if (filter === "keep") rows = rows.filter((r) => !r.isJunk);

    rows.sort((x, y) => (x.normTitle < y.normTitle ? -1 : x.normTitle > y.normTitle ? 1 : 0));

    const counts: Record<string, number> = {};
    for (const r of rows) if (r.normTitle) counts[r.normTitle] = (counts[r.normTitle] || 0) + 1;
    let groupSeq = 0;
    const groupId: Record<string, number> = {};
    const out = rows.slice(offset, offset + limit).map((r) => {
      let dupGroup: number | null = null;
      if (r.normTitle && counts[r.normTitle] > 1) {
        if (!(r.normTitle in groupId)) groupId[r.normTitle] = ++groupSeq;
        dupGroup = groupId[r.normTitle];
      }
      return { ...r, dupGroup, dupCount: r.normTitle ? counts[r.normTitle] : 1 };
    });

    return NextResponse.json({
      ok: true,
      mode: "list",
      filter,
      offset,
      limit,
      totalAfterFilter: rows.length,
      returned: out.length,
      nextOffset: offset + limit < rows.length ? offset + limit : null,
      rows: out,
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
        batch.map((id) => client.pages.update({ page_id: id, archived: true }))
      );
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") archived++;
        else if (errors.length < 10)
          errors.push(`${batch[j]}: ${(results[j] as PromiseRejectedResult).reason?.message}`);
      }
    }

    const remaining = targets.length - archived;
    return NextResponse.json({
      ok: true,
      mode: "archive",
      rule,
      matched: targets.length,
      archived,
      remaining,
      note:
        remaining > 0
          ? "尚有未處理，請再次呼叫同一網址繼續。"
          : "已全部封存。要永久刪除請到 Notion 垃圾桶手動清空。",
      errors,
      elapsedMs: Date.now() - start,
    });
  }

  return NextResponse.json({ ok: false, error: `未知 mode：${mode}` }, { status: 400 });
}
