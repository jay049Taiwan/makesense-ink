"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 建檔表單資料（modal 收齊後傳給上層）
 *
 * 作者/出版發行有兩種傳法：
 *  - 從 autocomplete 選了既有 person → 用 authorId / publisherId（DB08 notion_id）
 *  - 打了文字但沒對應 → 用 authorName / publisherName，後端會自動在 DB08 建一筆
 */
export interface ProductDraft {
  sku: string;
  name: string;
  price: number;
  photoFile: File;
  authorId?: string;
  publisherId?: string;
  authorName?: string;     // 自動建檔用
  publisherName?: string;  // 自動建檔用
}

interface ProductCreateModalProps {
  /** 從掃碼器來的條碼，預填到 SKU 欄位 */
  initialSku: string;
  /** 表單填好按「建檔並加入清單」時呼叫，上層負責背景跑上傳 + 建檔 */
  onSubmit: (draft: ProductDraft) => void;
  /** 取消或關閉 modal */
  onClose: () => void;
}

interface PersonOption {
  notion_id: string;
  name: string;
}

/**
 * 商品建檔表單 modal
 * 觸發時機：庫存掃碼查無此商品 → 跳此 modal
 *
 * 必填：商品名稱、售價、商品照片
 * 選填：作者、出版發行（從 Supabase persons 下拉選）
 *
 * 提交後：
 *   1. 上傳照片 → /api/upload-image → Cloudinary URL
 *   2. POST /api/staff/products/create → 同時寫 Notion DB07（待發佈）+ Supabase products（draft）
 *   3. onCreated() 回傳新商品給上層
 */
export default function ProductCreateModal({ initialSku, onSubmit, onClose }: ProductCreateModalProps) {
  // SKU 預設帶入掃碼結果，但 user 可手動改、或用「自動產生」按鈕
  const [sku, setSku] = useState(initialSku);
  const [showAutoSku, setShowAutoSku] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  // 作者：用 autocomplete 輸入。authorId = 連結到 DB08 的 notion_id（沒選就空字串）
  const [authorQuery, setAuthorQuery] = useState("");
  const [authorId, setAuthorId] = useState<string>("");
  const [authorSuggestions, setAuthorSuggestions] = useState<PersonOption[]>([]);
  // 出版發行：同上
  const [publisherQuery, setPublisherQuery] = useState("");
  const [publisherId, setPublisherId] = useState<string>("");
  const [publisherSuggestions, setPublisherSuggestions] = useState<PersonOption[]>([]);
  const [error, setError] = useState("");

  // 作者 autocomplete（debounce 200ms）
  useEffect(() => {
    const q = authorQuery.trim();
    if (!q) { setAuthorSuggestions([]); return; }
    // 已選中（query 等於 selected name）就不再查
    if (authorId) return;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("persons")
        .select("notion_id, name")
        .ilike("name", `%${q}%`)
        .limit(8);
      setAuthorSuggestions(((data || []).filter(p => p.notion_id && p.name)) as PersonOption[]);
    }, 200);
    return () => clearTimeout(t);
  }, [authorQuery, authorId]);

  // 出版發行 autocomplete（debounce 200ms）
  useEffect(() => {
    const q = publisherQuery.trim();
    if (!q) { setPublisherSuggestions([]); return; }
    if (publisherId) return;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("persons")
        .select("notion_id, name")
        .ilike("name", `%${q}%`)
        .limit(8);
      setPublisherSuggestions(((data || []).filter(p => p.notion_id && p.name)) as PersonOption[]);
    }, 200);
    return () => clearTimeout(t);
  }, [publisherQuery, publisherId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // 表單填齊後立刻呼叫 onSubmit 並關閉 modal，
  // 由父層負責背景跑「上傳照片 + 建檔」，使用者不用等
  const submit = () => {
    setError("");
    if (!sku.trim()) return setError("請輸入商品 ID（或按自動產生）");
    if (!name.trim()) return setError("請輸入商品名稱");
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0) return setError("請輸入有效售價");
    if (!photoFile) return setError("請上傳商品照片");

    // 作者/出版發行：選了既有 → 帶 id；只打字沒選 → 帶 name 給後端自動建 DB08
    const authorTrim = authorQuery.trim();
    const publisherTrim = publisherQuery.trim();
    onSubmit({
      sku: sku.trim(),
      name: name.trim(),
      price: priceNum,
      photoFile,
      authorId: authorId || undefined,
      publisherId: publisherId || undefined,
      authorName: !authorId && authorTrim ? authorTrim : undefined,
      publisherName: !publisherId && publisherTrim ? publisherTrim : undefined,
    });
  };

  return (
    <>
    {showAutoSku && (
      <AutoSkuOverlay
        onClose={() => setShowAutoSku(false)}
        onApply={(generated) => { setSku(generated); setShowAutoSku(false); }}
      />
    )}
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: "#fff" }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-3" style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
          <h2 className="text-base font-bold" style={{ color: "#333" }}>新增商品</h2>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-lg" style={{ color: "#666", background: "none", border: "1px solid #ddd", cursor: "pointer" }}>
            取消
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* SKU（可編輯，掃條碼自動帶入；自製商品按「自動產生」依規範編 10 碼）*/}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>
              商品 ID <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="掃條碼自動帶入，或按右側「自動產生」"
                className="flex-1 px-3 py-2 rounded text-sm outline-none"
                style={{ border: "1px solid #ddd" }}
              />
              <button
                type="button"
                onClick={() => setShowAutoSku(true)}
                className="px-3 py-2 rounded text-xs whitespace-nowrap"
                style={{ background: "transparent", border: "1px solid #7a5c40", color: "#7a5c40", cursor: "pointer" }}
              >
                自動產生
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#aaa" }}>
              {/^97[89]\d{10}$/.test(sku)
                ? "ISBN-13 格式 → 商品分類自動為「選書」"
                : sku.length === 10 && /^\d{10}$/.test(sku)
                  ? `自編 10 碼（類型 ${sku[0]}・製作 ${sku[1]}・年 ${sku.slice(2, 6)}・第 ${parseInt(sku.slice(6), 10)} 筆）`
                  : "非 ISBN 格式 → 商品分類預設為「選物」"}
            </p>
          </div>

          {/* 商品名稱 */}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>
              商品名稱 <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：宜蘭茶金傳奇"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd" }}
            />
          </div>

          {/* 售價 */}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>
              售價 <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="NT$"
              min={0}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd" }}
            />
          </div>

          {/* 商品照片 */}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>
              商品照片 <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="w-full text-xs"
            />
            {photoPreview && (
              <img src={photoPreview} alt="預覽" className="mt-2 rounded" style={{ maxHeight: 160, width: "auto" }} />
            )}
          </div>

          {/* 作者（選填，autocomplete）*/}
          <div className="relative">
            <label className="text-xs block mb-1" style={{ color: "#888" }}>作者（選填）</label>
            <input
              type="text"
              value={authorQuery}
              onChange={(e) => { setAuthorQuery(e.target.value); setAuthorId(""); }}
              placeholder="輸入作者名字…"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd" }}
            />
            {authorId && (
              <p className="text-[11px] mt-1" style={{ color: "#7a5c40" }}>✓ 已連結到 DB08</p>
            )}
            {!authorId && authorQuery && authorSuggestions.length === 0 && (
              <p className="text-[11px] mt-1" style={{ color: "#7a5c40" }}>＋ 建檔時會自動在 DB08 新增「{authorQuery}」（之後到 Notion 補欄位歸檔）</p>
            )}
            {authorSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-20" style={{ background: "#fff", border: "1px solid #ddd", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {authorSuggestions.map((p) => (
                  <button
                    key={p.notion_id}
                    type="button"
                    onClick={() => { setAuthorId(p.notion_id); setAuthorQuery(p.name); setAuthorSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    style={{ background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 出版發行（選填，autocomplete）*/}
          <div className="relative">
            <label className="text-xs block mb-1" style={{ color: "#888" }}>出版發行（選填）</label>
            <input
              type="text"
              value={publisherQuery}
              onChange={(e) => { setPublisherQuery(e.target.value); setPublisherId(""); }}
              placeholder="輸入出版社名字…"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd" }}
            />
            {publisherId && (
              <p className="text-[11px] mt-1" style={{ color: "#7a5c40" }}>✓ 已連結到 DB08</p>
            )}
            {!publisherId && publisherQuery && publisherSuggestions.length === 0 && (
              <p className="text-[11px] mt-1" style={{ color: "#7a5c40" }}>＋ 建檔時會自動在 DB08 新增「{publisherQuery}」（之後到 Notion 補欄位歸檔）</p>
            )}
            {publisherSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-20" style={{ background: "#fff", border: "1px solid #ddd", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {publisherSuggestions.map((p) => (
                  <button
                    key={p.notion_id}
                    type="button"
                    onClick={() => { setPublisherId(p.notion_id); setPublisherQuery(p.name); setPublisherSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    style={{ background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 提示 */}
          <p className="text-[11px]" style={{ color: "#888", lineHeight: 1.5 }}>
            建檔後 <strong>「發佈狀態 = 待發佈」</strong>，不會出現在官網。
            未來可在 Notion DB07 修改完整資訊（簡介、相關觀點、相關文章等）後，把發佈狀態改為「待發佈→已發佈」。
            <br />作者／出版發行若 DB08 沒對應，會自動在 DB08 建一筆（只有名稱），之後可到 Notion 補欄位歸檔。
          </p>

          {error && <p className="text-sm" style={{ color: "#e53e3e" }}>⚠️ {error}</p>}
          <p className="text-[11px]" style={{ color: "#7a5c40" }}>
            💡 按下「建檔並加入清單」會立刻關閉此視窗、把商品標記「⏳ 建檔中」加入清單，
            背景跑上傳跟寫 Notion，期間你可以繼續掃別的條碼。
          </p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-5 py-3 flex items-center justify-end gap-2" style={{ background: "#fff", borderTop: "1px solid #f0f0f0" }}>
          <button
            onClick={submit}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}
          >
            建檔並加入清單
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─────────────────────────────────────────────
// 自動產生商品 ID 小框（10 位數規範）
// 規則參考 Notion DB07 維護指南：
//   [類型 1 碼] + [製作 1 碼] + [年號 4 碼] + [流水 4 碼]
//   類型：1=商品 2=設備 3=耗材 4=其他
//   製作 (商品)：1=自己開發 2=第三方合作 3=他人製作
//   製作 (設備)：4=3C家電 5=佈置收藏 6=餐飲設備
//   製作 (耗材)：7=清潔用品 8=文具用品 9=包裝配件 0=其他
// 流水：去 Supabase products.sku 查同 prefix 最大號 +1（避免衝突）
// ─────────────────────────────────────────────
type CategoryType = "1" | "2" | "3" | "4";  // 商品/設備/耗材/其他
const TYPE_LABELS: Record<CategoryType, string> = {
  "1": "商品",
  "2": "設備",
  "3": "耗材",
  "4": "其他",
};
const MAKE_OPTIONS: Record<CategoryType, { code: string; label: string }[]> = {
  "1": [
    { code: "1", label: "自己開發" },
    { code: "2", label: "第三方合作" },
    { code: "3", label: "他人製作" },
  ],
  "2": [
    { code: "4", label: "3C 家電" },
    { code: "5", label: "佈置收藏" },
    { code: "6", label: "餐飲設備" },
  ],
  "3": [
    { code: "7", label: "清潔用品" },
    { code: "8", label: "文具用品" },
    { code: "9", label: "包裝配件" },
    { code: "0", label: "其他" },
  ],
  "4": [
    { code: "0", label: "其他" },
  ],
};

function AutoSkuOverlay({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (sku: string) => void;
}) {
  const [type, setType] = useState<CategoryType>("1");
  const [make, setMake] = useState<string>("1");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // type 改變時重置 make 為該類型第一個選項
  useEffect(() => {
    setMake(MAKE_OPTIONS[type][0].code);
  }, [type]);

  const year = new Date().getFullYear();
  const previewPrefix = `${type}${make}${year}`;

  const generate = async () => {
    setError("");
    setGenerating(true);
    try {
      // 查 Supabase 同 prefix 最大號（純數字 sku、開頭符合此 prefix）
      const { data, error: qErr } = await supabase
        .from("products")
        .select("sku")
        .like("sku", `${previewPrefix}%`)
        .order("sku", { ascending: false })
        .limit(1);
      if (qErr) throw qErr;
      let nextNum = 1;
      if (data && data[0]?.sku && /^\d{10}$/.test(data[0].sku)) {
        const seq = parseInt(data[0].sku.slice(6, 10), 10);
        if (!isNaN(seq)) nextNum = seq + 1;
      }
      const newSku = `${previewPrefix}${String(nextNum).padStart(4, "0")}`;
      onApply(newSku);
    } catch (e: any) {
      setError("查詢失敗：" + (e?.message || "未知錯誤"));
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold mb-3" style={{ color: "#333" }}>自動產生商品 ID</p>
        <p className="text-[11px] mb-4" style={{ color: "#888" }}>
          依 Notion DB07 規範產 10 位數編碼：<br />
          [類型] + [製作] + [年號] + [流水號]，流水號自動從 Supabase 查最大號 +1，不會撞號。
        </p>

        {/* 庫存類型 */}
        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: "#888" }}>庫存類型</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TYPE_LABELS) as CategoryType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="px-2 py-2 rounded text-sm"
                style={{
                  background: type === t ? "#7a5c40" : "#fff",
                  color: type === t ? "#fff" : "#666",
                  border: type === t ? "none" : "1px solid #ddd",
                  cursor: "pointer",
                  fontWeight: type === t ? 600 : 400,
                }}
              >
                {t} {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 製作方式 */}
        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: "#888" }}>製作方式</label>
          <div className="space-y-1">
            {MAKE_OPTIONS[type].map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setMake(opt.code)}
                className="w-full text-left px-3 py-2 rounded text-sm"
                style={{
                  background: make === opt.code ? "#fff8e1" : "#fff",
                  border: make === opt.code ? "2px solid #7a5c40" : "1px solid #ddd",
                  color: make === opt.code ? "#7a5c40" : "#666",
                  cursor: "pointer",
                  fontWeight: make === opt.code ? 600 : 400,
                }}
              >
                ({opt.code}) {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 預覽 */}
        <div className="mb-4 p-3 rounded" style={{ background: "#f8f7f4", border: "1px dashed #7a5c40" }}>
          <p className="text-[11px] mb-1" style={{ color: "#888" }}>預覽（流水號將即時查詢）</p>
          <p className="text-lg font-mono font-bold" style={{ color: "#7a5c40" }}>
            {previewPrefix}<span style={{ color: "#aaa" }}>○○○○</span>
          </p>
        </div>

        {error && <p className="text-sm mb-3" style={{ color: "#e53e3e" }}>⚠️ {error}</p>}

        {/* 按鈕 */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={generating} className="px-4 py-2 text-sm rounded-lg" style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: generating ? "not-allowed" : "pointer" }}>取消</button>
          <button onClick={generate} disabled={generating} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: generating ? "#aaa" : "#7a5c40", border: "none", cursor: generating ? "not-allowed" : "pointer" }}>
            {generating ? "查詢中…" : "✓ 產生並帶入"}
          </button>
        </div>
      </div>
    </div>
  );
}
