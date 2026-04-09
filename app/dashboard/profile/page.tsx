import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人資料",
};

export default function ProfilePage() {
  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold text-brand-brown mb-6">個人資料</h2>

      <form className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            電子信箱
          </label>
          <input
            type="email"
            disabled
            placeholder="user@example.com"
            className="w-full h-10 px-3 rounded-lg border border-border bg-brand-cream text-muted text-sm"
          />
          <p className="text-xs text-muted mt-1">信箱不可修改</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            顯示名稱
          </label>
          <input
            type="text"
            placeholder="你的名稱"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            電話號碼
          </label>
          <input
            type="tel"
            placeholder="0912-345-678"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
          />
        </div>

        <fieldset className="border border-border rounded-lg p-4">
          <legend className="text-sm font-medium text-foreground px-2">
            通知偏好
          </legend>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border text-brand-teal focus:ring-brand-teal"
              />
              LINE 官方帳號通知
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border text-brand-teal focus:ring-brand-teal"
              />
              Email 通知
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          className="h-10 px-6 rounded-lg bg-brand-brown text-white text-sm font-medium hover:bg-brand-brown/90 transition-colors"
        >
          儲存變更
        </button>
      </form>
    </div>
  );
}
