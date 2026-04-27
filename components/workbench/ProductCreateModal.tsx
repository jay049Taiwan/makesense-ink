"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { staffFetch } from "@/lib/staff-fetch";

interface ProductCreateModalProps {
  /** 從掃碼器來的條碼，預填到 SKU 欄位 */
  initialSku: string;
  /** 建檔成功後回傳新商品給上層加入清單 */
  onCreated: (product: { notion_id: string; name: string; price: number; sku: string }) => void;
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
export default function ProductCreateModal({ initialSku, onCreated, onClose }: ProductCreateModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [authorId, setAuthorId] = useState<string>("");
  const [publisherId, setPublisherId] = useState<string>("");
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progressMsg, setProgressMsg] = useState("");

  // 抓 Supabase persons 給 dropdown 用
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("persons")
        .select("notion_id, name")
        .order("name");
      if (error) {
        console.error("[create modal] persons fetch:", error);
      } else {
        setPersons((data || []).filter((p): p is PersonOption => Boolean(p.notion_id && p.name)));
      }
      setLoadingPersons(false);
    })();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    setError("");
    setProgressMsg("");

    if (!name.trim()) return setError("請輸入商品名稱");
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0) return setError("請輸入有效售價");
    if (!photoFile) return setError("請上傳商品照片");

    setSubmitting(true);

    try {
      // ── Step 1: 上傳照片到 Cloudinary ──
      setProgressMsg("上傳照片中…");
      const fd = new FormData();
      fd.append("file", photoFile);
      fd.append("folder", "makesense/products");
      const upRes = await fetch("/api/upload-image", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.url) throw new Error(upJson.error || "照片上傳失敗");

      // ── Step 2: 呼叫 create API（staffFetch 自動帶 X-Telegram-Init-Data）──
      setProgressMsg("建立商品中…");
      const createRes = await staffFetch("/api/staff/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: initialSku,
          name: name.trim(),
          price: priceNum,
          photoUrl: upJson.url,
          authorId: authorId || undefined,
          publisherId: publisherId || undefined,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok || !createJson.ok) throw new Error(createJson.error || "建立失敗");

      const product = createJson.product;
      if (!product?.notion_id) throw new Error("API 回傳缺少 notion_id");

      onCreated({
        notion_id: product.notion_id,
        name: product.name || name.trim(),
        price: product.price ?? priceNum,
        sku: product.sku || initialSku,
      });
    } catch (err: any) {
      setError(err?.message || "未知錯誤");
      setSubmitting(false);
    }
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
          <button onClick={onClose} disabled={submitting} className="text-sm px-3 py-1 rounded-lg" style={{ color: "#666", background: "none", border: "1px solid #ddd", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.5 : 1 }}>
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

          {/* 作者（選填）*/}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>作者（選填）</label>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              disabled={loadingPersons}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd", background: "#fff" }}
            >
              <option value="">{loadingPersons ? "載入中…" : "（不指定）"}</option>
              {persons.map((p) => (
                <option key={p.notion_id} value={p.notion_id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 出版發行（選填）*/}
          <div>
            <label className="text-xs block mb-1" style={{ color: "#888" }}>出版發行（選填）</label>
            <select
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              disabled={loadingPersons}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ border: "1px solid #ddd", background: "#fff" }}
            >
              <option value="">{loadingPersons ? "載入中…" : "（不指定）"}</option>
              {persons.map((p) => (
                <option key={p.notion_id} value={p.notion_id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 提示 */}
          <p className="text-[11px]" style={{ color: "#888", lineHeight: 1.5 }}>
            建檔後 <strong>「發佈狀態 = 待發佈」</strong>，不會出現在官網。
            未來可在 Notion DB07 修改完整資訊（簡介、相關觀點、相關文章等）後，把發佈狀態改為「待發佈→已發佈」。
          </p>

          {error && <p className="text-sm" style={{ color: "#e53e3e" }}>⚠️ {error}</p>}
          {progressMsg && <p className="text-sm" style={{ color: "#7a5c40" }}>⏳ {progressMsg}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-5 py-3 flex items-center justify-end gap-2" style={{ background: "#fff", borderTop: "1px solid #f0f0f0" }}>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: submitting ? "#aaa" : "#7a5c40", border: "none", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "建檔中…" : "建檔並加入清單"}
          </button>
        </div>
      </div>
    </div>
  );
}
