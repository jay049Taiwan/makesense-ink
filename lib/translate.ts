import { supabaseAdmin } from "./supabase";
import { createHash } from "crypto";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LOCALES = ["en", "ja", "ko"] as const;

/** SHA-256 hash 用於判斷原文是否變動，避免重複翻譯 */
function sourceHash(fields: [string, string | null][]): string {
  const concat = fields.map(([k, v]) => `${k}::${v || ""}`).join("\n");
  return createHash("sha256").update(concat).digest("hex").slice(0, 16);
}

interface TranslateRequest {
  tableName: string;
  rowId: string;
  fields: Record<string, string | null>; // field name → original Chinese text
}

/**
 * 用 Claude Haiku 翻譯一筆資料的多個欄位到英日韓
 * 翻譯失敗不拋錯，只 log（不阻擋同步）
 */
export async function translateRow(req: TranslateRequest): Promise<void> {
  if (!ANTHROPIC_API_KEY) {
    console.warn("[translate] ANTHROPIC_API_KEY not set, skipping translation");
    return;
  }

  // 過濾掉空值和太短的文字（不值得翻譯）
  const fieldsToTranslate = Object.entries(req.fields).filter(
    ([, val]) => val && val.trim().length > 1
  );
  if (fieldsToTranslate.length === 0) return;

  for (const locale of LOCALES) {
    try {
      await translateRowToLocale(req.tableName, req.rowId, fieldsToTranslate, locale);
    } catch (err: any) {
      console.error(`[translate] Failed ${req.tableName}/${req.rowId} → ${locale}:`, err.message);
    }
  }
}

async function translateRowToLocale(
  tableName: string,
  rowId: string,
  fields: [string, string | null][],
  locale: string
): Promise<void> {
  // Hash check：原文跟既有翻譯的 source_hash 相同就跳過（避免重翻浪費 API）
  const hash = sourceHash(fields);
  const { data: existing } = await supabaseAdmin
    .from("translations")
    .select("field, source_hash")
    .eq("table_name", tableName)
    .eq("row_id", rowId)
    .eq("locale", locale);

  if (existing && existing.length > 0) {
    const allMatch = existing.every((r: any) => r.source_hash === hash);
    const fieldsCovered = new Set(existing.map((r: any) => r.field));
    const allFieldsTranslated = fields.every(([f]) => fieldsCovered.has(f));
    if (allMatch && allFieldsTranslated) {
      console.log(`[translate] skip ${tableName}/${rowId}/${locale} (hash unchanged: ${hash})`);
      return;
    }
  }

  const langName = { en: "English", ja: "Japanese", ko: "Korean" }[locale] || locale;
  const context = {
    products: "This is a product listing for a Taiwanese cultural bookstore/goods shop in Yilan.",
    events: "This is an event/activity listing for a Taiwanese cultural organization in Yilan.",
    articles: "This is an article/newsletter from a Taiwanese local culture platform in Yilan.",
    topics: "This is a cultural viewpoint/topic from a Taiwanese local culture platform in Yilan.",
  }[tableName] || "This is content from a Taiwanese cultural organization.";

  // 組合翻譯請求
  const fieldTexts = fields.map(([name, val]) => `[${name}]\n${val}`).join("\n\n");

  const prompt = `Translate the following content from Traditional Chinese to ${langName}. ${context}

CRITICAL FORMATTING RULES:
1. For all proper nouns (places, people, ethnic groups, brand names, building names, organization names, indigenous terms), format as: TranslatedTerm（OriginalChinese）
   Examples:
   - 噶瑪蘭族 → Kavalan（噶瑪蘭族）
   - 加禮宛 → Kalinawan（加禮宛）
   - 五結鄉 → Wujie Township（五結鄉）
   - 旅人書店 → Traveler Bookstore（旅人書店）
   - 宜蘭 → Yilan（宜蘭）
   - 蘭陽平原 → Lanyang Plain（蘭陽平原）
2. Keep monetary values in original (NT$ 200, etc.).
3. For HTML content, preserve all HTML tags; only translate text inside.
4. Use Chinese full-width parentheses （） not half-width, around the original Chinese.
5. First mention of a proper noun gets the parenthesized original; subsequent mentions in the same field can omit it.
6. Brand names that are already widely known in Latin script (e.g., "Apple") may be kept as-is without parentheses.

Return ONLY the translations in the exact same format, with [field_name] headers, no preamble.

${fieldTexts}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const responseText = data.content?.[0]?.text || "";

  // 解析回傳的翻譯
  const translations = parseTranslationResponse(responseText, fields.map(([name]) => name));

  // 寫入 Supabase（含 source_hash 供下次比對）
  const upserts = Object.entries(translations)
    .filter(([, val]) => val && val.trim().length > 0)
    .map(([field, value]) => ({
      table_name: tableName,
      row_id: rowId,
      locale,
      field,
      value: value!,
      source_hash: hash,
      updated_at: new Date().toISOString(),
    }));

  if (upserts.length === 0) return;

  const { error } = await supabaseAdmin
    .from("translations")
    .upsert(upserts, { onConflict: "table_name,row_id,locale,field" });

  if (error) {
    console.error(`[translate] Supabase upsert error:`, error.message);
  }
}

function parseTranslationResponse(text: string, fieldNames: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < fieldNames.length; i++) {
    const name = fieldNames[i];
    const pattern = new RegExp(`\\[${name}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)`);
    const match = text.match(pattern);
    if (match) {
      result[name] = match[1].trim();
    }
  }

  return result;
}

/**
 * 批次翻譯多筆資料（用於 /api/sync/translate）
 */
export async function translateBatch(
  tableName: string,
  rows: { id: string; fields: Record<string, string | null> }[],
  options?: { delayMs?: number }
): Promise<{ translated: number; errors: number }> {
  let translated = 0;
  let errors = 0;
  const delay = options?.delayMs || 500;

  for (const row of rows) {
    try {
      await translateRow({ tableName, rowId: row.id, fields: row.fields });
      translated++;
    } catch {
      errors++;
    }
    // Rate limit
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  }

  return { translated, errors };
}

/**
 * 取得某筆資料的翻譯（前端讀取用）
 */
export async function getTranslations(
  tableName: string,
  rowId: string,
  locale: string
): Promise<Record<string, string>> {
  if (locale === "zh") return {}; // 中文是原始資料

  const { data } = await supabaseAdmin
    .from("translations")
    .select("field, value")
    .eq("table_name", tableName)
    .eq("row_id", rowId)
    .eq("locale", locale);

  const result: Record<string, string> = {};
  for (const row of data || []) {
    result[row.field] = row.value;
  }
  return result;
}

/**
 * 批次取得多筆資料的翻譯
 */
export async function getTranslationsBatch(
  tableName: string,
  rowIds: string[],
  locale: string
): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>();
  if (locale === "zh" || rowIds.length === 0) return map;

  const { data } = await supabaseAdmin
    .from("translations")
    .select("row_id, field, value")
    .eq("table_name", tableName)
    .eq("locale", locale)
    .in("row_id", rowIds);

  for (const row of data || []) {
    if (!map.has(row.row_id)) map.set(row.row_id, {});
    map.get(row.row_id)![row.field] = row.value;
  }

  return map;
}
