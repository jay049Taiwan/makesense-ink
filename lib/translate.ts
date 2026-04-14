import { supabaseAdmin } from "./supabase";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LOCALES = ["en", "ja", "ko"] as const;

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
Keep proper nouns, brand names (旅人書店, 宜蘭文化俱樂部, 現思文化), place names, and monetary values (NT$) in their original form or use the conventional local translation.
For HTML content, preserve all HTML tags and only translate the text content.
Return ONLY the translations in the exact same format, with [field_name] headers.

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

  // 寫入 Supabase
  const upserts = Object.entries(translations)
    .filter(([, val]) => val && val.trim().length > 0)
    .map(([field, value]) => ({
      table_name: tableName,
      row_id: rowId,
      locale,
      field,
      value: value!,
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
