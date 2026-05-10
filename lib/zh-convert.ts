// 簡轉繁工具：用 opencc-js s2twp（簡體 → 台灣繁體 + 詞彙）
// 用於 sync 時把 Notion Place property 抽到的中國地址（簡體）轉成繁體寫進 Supabase
// 一勞永逸：源頭乾淨後，下游翻譯（JP/KR/EN）都拿乾淨繁體當源頭

import * as OpenCC from "opencc-js";

let _converter: ((s: string) => string) | null = null;

function getConverter() {
  if (_converter) return _converter;
  // s2twp = Simplified Chinese → Traditional Chinese (Taiwan) with phrase conversion
  // 例：软件信息存储 → 軟體資訊儲存
  _converter = OpenCC.Converter({ from: "cn", to: "twp" });
  return _converter;
}

/** 把可能含簡體字的字串轉成台灣繁體（含用詞轉換） */
export function toTraditional(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    return getConverter()(input);
  } catch (e) {
    console.warn("[zh-convert] failed:", e);
    return input; // 失敗就回傳原文，不阻斷流程
  }
}
