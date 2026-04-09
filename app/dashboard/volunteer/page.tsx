import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "志工服務",
};

export default function VolunteerPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-6">志工服務</h2>

      {/* Locked state */}
      <div className="rounded-xl border border-border p-12 bg-white text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-lg font-medium text-foreground mb-2">
          志工功能尚未解鎖
        </p>
        <p className="text-sm text-muted max-w-md mx-auto mb-6">
          成為志工可以獲得額外點數、優先報名活動、以及更多專屬福利。
        </p>
        <ul className="text-sm text-muted space-y-1 max-w-xs mx-auto text-left">
          <li>• 參與志工活動獲得點數</li>
          <li>• 優先報名熱門活動</li>
          <li>• 志工專屬聚會與培訓</li>
          <li>• 兼職工作機會通知</li>
        </ul>
      </div>
    </div>
  );
}
