"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 建檔表單資料（modal 收齊後傳給上層）
 */
export interface ProductDraft {
  sku: string;
  name: string;
  price: number;
  photoFile: File;
  authorId?: string;
  publisherId?: string;
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
    if (!name.trim()) return setError("請輸入商品名稱");
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0) return setError("請輸入有效售價");
    if (!photoFile) return setError("請上傳商品照片");

    onSubmit({
      sku: initialSku,
      name: name.trim(),
      price: priceNum,
      photoFile,
      authorId: authorId || undefined,
      publisherId: publisherId || undefined,
    });
  };

  return (
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
          {/* SKU（自動帶入，不可編輯）*/}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>商品 ID（已自動帶入）</label>
            <input
              type="text"
              value={initialSku}
              readOnly
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: "#f8f7f4", border: "1px solid #ddd", color: "#666" }}
            />
            <p className="text-[10px] mt-1" style={{ color: "#aaa" }}>
              {/^97[89]\d{10}$/.test(initialSku) ? "ISBN-13 格式 → 商品分類自動為「選書」" : "非 ISBN 格式 → 商品分類預設為「選物」"}
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
              <p className="text-[11px] mt-1" style={{ color: "#999" }}>找不到「{authorQuery}」，這次不帶入此欄位，建檔後請到 Notion DB07 手動補關聯</p>
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
              <p className="text-[11px] mt-1" style={{ color: "#999" }}>找不到「{publisherQuery}」，這次不帶入此欄位，建檔後請到 Notion DB07 手動補關聯</p>
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
            <br />作者／出版發行若 DB08 沒對應，這次不帶入；建檔後可到 Notion DB07 手動補關聯。
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
  );
}
