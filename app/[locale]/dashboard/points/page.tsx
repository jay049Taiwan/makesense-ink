"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Balance {
  spending_points: number;
  books_purchased: number;
  articles_unlocked: number;
  distance_km: number;
  checkin_count: number;
  last_updated: string | null;
}

interface LedgerEntry {
  id: string;
  type: string;
  value: number;
  source_table: string | null;
  source_id: string | null;
  note: string | null;
  expires_at: string | null;
  created_at: string;
}

const TYPE_COLOR: Record<string, string> = {
  "消費積點": "var(--color-teal)",
  "書籍本數": "var(--color-rust)",
  "付費文章": "var(--color-orange)",
  "距離行程": "var(--color-moss)",
  "簽到退": "var(--color-bark)",
};

export default function MyPointsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/points");
        if (!res.ok) {
          if (res.status === 401) setError("請先登入");
          else setError("讀取失敗");
          setLoading(false);
          return;
        }
        const { balance, ledger } = await res.json();
        setBalance(balance);
        setLedger(ledger);
      } catch (e: any) {
        setError("網路錯誤");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1200 }}>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-teal)" }}>
          ← 回會員中心
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          — MY POINTS —
        </p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          我的積點
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-bark)" }}>
          消費點數可折抵或兌換活動（每消費 10 元累積 1 點，未過期才可使用）；其他為累積紀錄。
        </p>
      </div>

      {loading && <p className="text-sm" style={{ color: "var(--color-mist)" }}>載入中⋯</p>}
      {error && <p className="text-sm" style={{ color: "#c53030" }}>{error}</p>}

      {balance && (
        <>
          {/* 餘額卡 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            <BalanceCard label="可用消費點數" value={Number(balance.spending_points).toLocaleString()} unit="點" highlight />
            <BalanceCard label="購買書籍" value={Number(balance.books_purchased).toLocaleString()} unit="本" />
            <BalanceCard label="解鎖文章" value={Number(balance.articles_unlocked).toLocaleString()} unit="篇" />
            <BalanceCard label="走讀距離" value={Number(balance.distance_km).toLocaleString()} unit="km" />
            <BalanceCard label="活動簽到" value={Number(balance.checkin_count).toLocaleString()} unit="次" />
          </div>

          {/* 流水 */}
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
            積點明細
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-mist)" }}>
              （顯示最近 100 筆）
            </span>
          </h2>

          {ledger.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ border: "1px solid var(--color-dust)", background: "var(--color-warm-white)" }}>
              <p className="text-sm" style={{ color: "var(--color-mist)" }}>尚無積點紀錄</p>
              <p className="text-xs mt-2" style={{ color: "var(--color-mist)" }}>
                完成購物、參加活動後會在這裡看到
              </p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
              {ledger.map((e, i) => {
                const expired = e.expires_at && new Date(e.expires_at) < new Date();
                const isNegative = Number(e.value) < 0;
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3"
                    style={{ borderBottom: i < ledger.length - 1 ? "1px solid var(--color-dust)" : "none", opacity: expired ? 0.5 : 1 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block text-[0.7em] px-2 py-0.5 rounded-full" style={{ background: TYPE_COLOR[e.type] || "var(--color-bark)", color: "#fff" }}>
                          {e.type}
                        </span>
                        {expired && (
                          <span className="text-[0.65em] px-1.5 py-0.5 rounded" style={{ background: "rgba(229,62,62,0.08)", color: "#c53030" }}>
                            已過期
                          </span>
                        )}
                      </div>
                      {e.note && <p className="text-sm" style={{ color: "var(--color-ink)" }}>{e.note}</p>}
                      <p className="text-[0.7em] mt-0.5" style={{ color: "var(--color-mist)" }}>
                        {new Date(e.created_at).toLocaleString("zh-TW")}
                        {e.expires_at && (
                          <span className="ml-2">· 到期：{new Date(e.expires_at).toLocaleDateString("zh-TW")}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-base font-medium" style={{ color: isNegative ? "#c53030" : "var(--color-ink)" }}>
                        {isNegative ? "" : "+"}{Number(e.value).toLocaleString()}
                      </span>
                      <span className="text-xs ml-1" style={{ color: "var(--color-mist)" }}>
                        {e.type === "消費積點" ? "點" : e.type === "書籍本數" ? "本" : e.type === "付費文章" ? "篇" : e.type === "距離行程" ? "km" : "次"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {balance.last_updated && (
            <p className="text-[0.7em] text-center mt-6" style={{ color: "var(--color-mist)" }}>
              最後更新：{new Date(balance.last_updated).toLocaleString("zh-TW")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BalanceCard({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg p-4" style={{
      border: highlight ? "2px solid var(--color-teal)" : "1px solid var(--color-dust)",
      background: highlight ? "rgba(78,205,196,0.06)" : "#fff",
    }}>
      <p className="text-[0.7em] mb-1" style={{ color: "var(--color-mist)" }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-medium" style={{
          fontFamily: "var(--font-serif)",
          color: highlight ? "var(--color-teal)" : "var(--color-ink)",
        }}>
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--color-bark)" }}>{unit}</span>
      </div>
    </div>
  );
}
