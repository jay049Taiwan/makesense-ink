"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Photo {
  id: string;
  category: string;
  url: string;
  filename: string | null;
  archived_at: string | null;
  created_at: string;
}

interface Props {
  eventId: string;
  eventSlug: string;
  defaultContactName: string;
  defaultContactPhone: string;
  defaultContactEmail: string;
}

const CATEGORIES: { id: string; label: string; multi: boolean; hint: string }[] = [
  { id: "logo", label: "LOGO", multi: false, hint: "1 張為主，建議方形或透明背景" },
  { id: "image", label: "形象照", multi: true, hint: "攤位、品牌氛圍、主理人合照等" },
  { id: "product", label: "產品照", multi: true, hint: "主打商品、菜色、選物" },
  { id: "activity", label: "活動體驗照", multi: true, hint: "市集現場、互動體驗、工作坊" },
  { id: "performance", label: "表演照", multi: true, hint: "若有現場演出、示範" },
];

const BOOTH_OPTIONS = ["電源", "桌椅", "帳篷", "雙位", "需停車證"];

export default function MarketApplyForm({
  eventId, eventSlug, defaultContactName, defaultContactPhone, defaultContactEmail,
}: Props) {
  const router = useRouter();

  // 表單欄位
  const [vendorName, setVendorName] = useState("");
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactPhone, setContactPhone] = useState(defaultContactPhone);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [intro, setIntro] = useState("");
  const [mainProducts, setMainProducts] = useState("");
  const [boothNeeds, setBoothNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // 照片庫
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [archivedPhotos, setArchivedPhotos] = useState<Photo[]>([]);
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 初次載入照片庫
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vendor-photos");
        if (res.ok) {
          const { photos } = await res.json();
          setPhotos(photos || []);
          // 預設全部勾選
          setSelected(new Set((photos || []).map((p: Photo) => p.id)));
        }
      } catch {}
      setLoadingPhotos(false);
    })();
  }, []);

  // 載入封存（按需）
  async function loadArchived() {
    try {
      const res = await fetch("/api/vendor-photos?include_archived=1");
      if (res.ok) {
        const { photos: all } = await res.json();
        setArchivedPhotos((all || []).filter((p: Photo) => p.archived_at !== null));
      }
    } catch {}
  }

  function toggleArchivedView(category: string) {
    setShowArchived((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      if (next[category]) loadArchived();
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleUpload(category: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    try {
      const res = await fetch("/api/vendor-photos", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("上傳失敗：" + (err.error || res.statusText));
        return;
      }
      const { photo } = await res.json();
      setPhotos((prev) => [photo, ...prev]);
      setSelected((prev) => new Set(prev).add(photo.id));
    } catch (e: any) {
      alert("上傳失敗：" + e.message);
    }
  }

  async function archivePhoto(id: string) {
    if (!confirm("封存這張照片？平常不再顯示，可從「📂 顯示封存」找回。")) return;
    try {
      const res = await fetch(`/api/vendor-photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (res.ok) {
        const { photo } = await res.json();
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setArchivedPhotos((prev) => [photo, ...prev]);
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
    } catch {}
  }

  async function restorePhoto(id: string) {
    try {
      const res = await fetch(`/api/vendor-photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (res.ok) {
        const { photo } = await res.json();
        setArchivedPhotos((prev) => prev.filter((p) => p.id !== id));
        setPhotos((prev) => [photo, ...prev]);
        setSelected((prev) => new Set(prev).add(photo.id));
      }
    } catch {}
  }

  function toggleBoothNeed(need: string) {
    setBoothNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!vendorName.trim()) {
      setError("請填攤商名稱");
      return;
    }
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      setError("請填完整的聯絡資訊");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/market-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          vendorName: vendorName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          intro: intro.trim(),
          mainProducts: mainProducts.trim(),
          boothNeeds,
          notes: notes.trim(),
          selectedPhotoIds: [...selected],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError("送出失敗：" + (errData.error || res.statusText));
        setSubmitting(false);
        return;
      }
      // 成功 → 導向感謝頁
      router.push(`/market-apply/${eventSlug}/done`);
    } catch (e: any) {
      setError("送出失敗：" + e.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 攤商資訊 */}
      <section className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          1. 攤商資訊
        </h2>
        <div className="space-y-3">
          <Field label="攤商名稱" required>
            <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle}
              placeholder="例：旅人書店" />
          </Field>
          <Field label="攤商簡介">
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle}
              placeholder="一段話介紹你的品牌、理念" />
          </Field>
          <Field label="主要產品/服務">
            <textarea value={mainProducts} onChange={(e) => setMainProducts(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle}
              placeholder="這次想帶什麼商品/體驗到市集？" />
          </Field>
        </div>
      </section>

      {/* 聯絡資訊 */}
      <section className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          2. 聯絡資訊
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="聯絡人姓名" required>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
          </Field>
          <Field label="電話" required>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
          </Field>
          <Field label="Email" required>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
          </Field>
        </div>
      </section>

      {/* 攤位需求 */}
      <section className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          3. 攤位需求
        </h2>
        <div className="flex flex-wrap gap-2">
          {BOOTH_OPTIONS.map((opt) => (
            <button key={opt} type="button" onClick={() => toggleBoothNeed(opt)}
              className="px-3 py-1.5 rounded-full text-sm transition-colors"
              style={{
                background: boothNeeds.includes(opt) ? "var(--color-teal)" : "var(--color-warm-white)",
                color: boothNeeds.includes(opt) ? "#fff" : "var(--color-bark)",
                border: `1px solid ${boothNeeds.includes(opt) ? "var(--color-teal)" : "var(--color-dust)"}`,
              }}>
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* 照片區 */}
      <section className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--color-ink)" }}>
          4. 照片
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>
          ✓ 勾選 = 這次提交時會用 ；📦 封存 = 平常不顯示，可隨時取出 ；以 Email 為記憶 key，下次申請會自動載入
        </p>

        {loadingPhotos ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--color-mist)" }}>載入照片庫…</p>
        ) : (
          CATEGORIES.map((cat) => {
            const catPhotos = photos.filter((p) => p.category === cat.id);
            const catArchived = archivedPhotos.filter((p) => p.category === cat.id);
            return (
              <div key={cat.id} className="mb-5 pb-5" style={{ borderBottom: "1px dashed var(--color-dust)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                      {cat.label}
                      {cat.multi && <span className="ml-1.5 text-xs" style={{ color: "var(--color-mist)" }}>（可多張）</span>}
                    </h3>
                    <p className="text-[0.7em]" style={{ color: "var(--color-mist)" }}>{cat.hint}</p>
                  </div>
                  <UploadButton category={cat.id} onUpload={(f) => handleUpload(cat.id, f)} />
                </div>

                {catPhotos.length === 0 && (
                  <p className="text-xs py-3" style={{ color: "var(--color-mist)" }}>尚未上傳</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {catPhotos.map((p) => (
                    <PhotoCard
                      key={p.id} photo={p}
                      checked={selected.has(p.id)}
                      onToggleCheck={() => toggleSelected(p.id)}
                      onArchive={() => archivePhoto(p.id)}
                      archived={false}
                    />
                  ))}
                </div>

                {/* 顯示封存切換 */}
                <div className="mt-3">
                  <button type="button" onClick={() => toggleArchivedView(cat.id)}
                    className="text-xs underline-offset-2 hover:underline"
                    style={{ color: "var(--color-mist)" }}>
                    {showArchived[cat.id] ? "▾ 收起封存照片" : "▸ 顯示封存照片"}
                  </button>
                </div>
                {showArchived[cat.id] && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {catArchived.length === 0 && (
                      <p className="text-xs col-span-full" style={{ color: "var(--color-mist)" }}>沒有封存的{cat.label}</p>
                    )}
                    {catArchived.map((p) => (
                      <PhotoCard
                        key={p.id} photo={p}
                        checked={false}
                        onToggleCheck={() => {}}
                        onRestore={() => restorePhoto(p.id)}
                        archived={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* 備註 */}
      <section className="rounded-lg p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          5. 備註（選填）
        </h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded text-sm" style={inputStyle}
          placeholder="特殊需求、合作建議、想跟我們聊的⋯" />
      </section>

      {/* 送出 */}
      {error && (
        <p className="text-sm p-3 rounded" style={{ background: "rgba(229,62,62,0.08)", color: "#c53030" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}
        className="w-full py-3 rounded-md text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--color-teal)", color: "#fff" }}>
        {submitting ? "送出中…" : "送出申請"}
      </button>
      <p className="text-[0.7em] text-center" style={{ color: "var(--color-mist)" }}>
        送出後會以 Email / LINE 通知審核結果。可隨時再次提交，會以最新一筆為準。
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-dust)",
  background: "#fff",
  outline: "none",
  color: "var(--color-ink)",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "var(--color-bark)" }}>
        {label}{required && <span style={{ color: "#c53030" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function UploadButton({ category, onUpload }: { category: string; onUpload: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-90"
        style={{ background: "var(--color-bark)", color: "#fff" }}>
        + 上傳
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </>
  );
}

function PhotoCard({ photo, checked, onToggleCheck, onArchive, onRestore, archived }: {
  photo: Photo; checked: boolean; onToggleCheck: () => void;
  onArchive?: () => void; onRestore?: () => void; archived: boolean;
}) {
  return (
    <div className="relative rounded-lg overflow-hidden"
      style={{
        border: archived ? "1px solid var(--color-dust)" :
                checked ? "2px solid var(--color-teal)" : "1px solid var(--color-dust)",
        background: "#fff",
        opacity: archived ? 0.7 : 1,
      }}>
      <div className="aspect-square overflow-hidden">
        <img src={photo.url} alt={photo.filename || ""}
          className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {!archived && onArchive && (
          <button type="button" onClick={onArchive}
            title="封存（平常不顯示，可從「顯示封存」取回）"
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
            style={{ background: "rgba(255,255,255,0.92)", color: "var(--color-bark)" }}>
            📦
          </button>
        )}
        {archived && onRestore && (
          <button type="button" onClick={onRestore}
            title="取出（恢復顯示）"
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
            style={{ background: "rgba(255,255,255,0.92)", color: "var(--color-teal)" }}>
            📤
          </button>
        )}
      </div>
      {!archived && (
        <button type="button" onClick={onToggleCheck}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
          style={{
            background: checked ? "var(--color-teal)" : "rgba(255,255,255,0.92)",
            color: checked ? "#fff" : "var(--color-mist)",
          }}>
          {checked ? "✓" : "○"}
        </button>
      )}
    </div>
  );
}
