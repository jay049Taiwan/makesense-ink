"""
嗨嗨文案 批次腳本模板
========================
每次寫新的地方通訊批次腳本時，從這裡複製 write_article_content() 使用。
核心保證：寫完頁面後自動驗證字數，未達目標不標記完成。

使用方式：
    from hihi_writer_template import HihiWriter
    writer = HihiWriter(token)
    writer.write_article(page_id, blocks, word_target_min=600, word_target_max=800)
"""

import requests
import time
import re


class HihiWriter:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }
        self.db06_id = "3469ff25fdab83c98ff98107ee6a6a1c"

    # ──────────────────────────────────────────
    # 頁面 block 操作
    # ──────────────────────────────────────────

    def archive_all_blocks(self, page_id: str):
        """清除頁面現有所有 block"""
        r = requests.get(
            f"https://api.notion.com/v1/blocks/{page_id}/children",
            headers=self.headers,
        )
        for b in r.json().get("results", []):
            requests.patch(
                f"https://api.notion.com/v1/blocks/{b['id']}",
                headers=self.headers,
                json={"archived": True},
            )
            time.sleep(0.08)

    def append_blocks(self, page_id: str, blocks: list) -> int:
        """批次寫入 block，每批最多 10 個，回傳 HTTP status"""
        last_status = 200
        for i in range(0, len(blocks), 10):
            r = requests.patch(
                f"https://api.notion.com/v1/blocks/{page_id}/children",
                headers=self.headers,
                json={"children": blocks[i : i + 10]},
            )
            last_status = r.status_code
            time.sleep(0.2)
        return last_status

    # ──────────────────────────────────────────
    # 字數驗證
    # ──────────────────────────────────────────

    def count_page_words(self, page_id: str) -> int:
        """讀回頁面所有 block，計算中文字元總數"""
        r = requests.get(
            f"https://api.notion.com/v1/blocks/{page_id}/children",
            headers=self.headers,
        )
        total = 0
        for b in r.json().get("results", []):
            for btype in ("paragraph", "heading_2", "heading_3", "quote", "callout"):
                if btype in b:
                    for rt in b[btype].get("rich_text", []):
                        total += len(rt.get("text", {}).get("content", ""))
        return total

    def extract_word_target(self, plan_note: str) -> tuple[int, int] | None:
        """
        從 ai企劃備註 抓 【字數目標】xxx–xxx字
        找不到回傳 None
        """
        m = re.search(r"【字數目標】(\d+)[–\-~～至到](\d+)字", plan_note)
        if m:
            return int(m.group(1)), int(m.group(2))
        # 只有單一數字的情況（如 【字數目標】600字以上）
        m2 = re.search(r"【字數目標】(\d+)字", plan_note)
        if m2:
            return int(m2.group(1)), int(m2.group(1)) * 2
        return None

    # ──────────────────────────────────────────
    # 核心：寫文章並驗證
    # ──────────────────────────────────────────

    def write_article(
        self,
        page_id: str,
        blocks: list,
        word_target_min: int = 600,
        word_target_max: int = 800,
        title: str = "",
        max_retry: int = 2,
    ) -> dict:
        """
        寫文章頁面並驗證字數。
        回傳 {"success": bool, "word_count": int, "target_min": int, "note": str}

        流程：
        1. 清除舊 block
        2. 寫入新 block
        3. 讀回計算字數
        4. 達標 → success=True
        5. 未達標 → 回傳 success=False，呼叫端決定是否補寫
        """
        label = title or page_id[:8]
        self.archive_all_blocks(page_id)
        time.sleep(0.3)
        self.append_blocks(page_id, blocks)
        time.sleep(0.3)

        word_count = self.count_page_words(page_id)

        if word_count >= word_target_min:
            print(f"  ✅ {label}：{word_count}字（目標 {word_target_min}–{word_target_max}字）")
            return {
                "success": True,
                "word_count": word_count,
                "target_min": word_target_min,
                "note": "",
            }
        else:
            gap = word_target_min - word_count
            print(f"  ❌ {label}：{word_count}字，距目標差 {gap}字 → 未達標，不標記完成")
            return {
                "success": False,
                "word_count": word_count,
                "target_min": word_target_min,
                "note": f"字數 {word_count}字，未達目標 {word_target_min}字，差 {gap}字",
            }

    # ──────────────────────────────────────────
    # DB06 管考完成標記（驗證通過後才呼叫）
    # ──────────────────────────────────────────

    def mark_db06_complete(self, db06_item_id: str):
        """把 DB06 管考項目標記為已完成"""
        requests.patch(
            f"https://api.notion.com/v1/pages/{db06_item_id}",
            headers=self.headers,
            json={"properties": {"執行狀態": {"status": {"name": "已完成"}}}},
        )

    def mark_ai_wenas_complete(self, page_id: str):
        """把 DB05 page 的 ai文案 設為完成，並更新發佈狀態"""
        requests.patch(
            f"https://api.notion.com/v1/pages/{page_id}",
            headers=self.headers,
            json={
                "properties": {
                    "ai文案": {"status": {"name": "完成"}},
                    "發佈狀態": {"status": {"name": "待發佈"}},
                }
            },
        )

    def write_failure_note(self, page_id: str, note: str):
        """驗證失敗時把說明寫入 ai文案備註"""
        requests.patch(
            f"https://api.notion.com/v1/pages/{page_id}",
            headers=self.headers,
            json={
                "properties": {
                    "ai文案備註": {"rich_text": [{"text": {"content": note}}]}
                }
            },
        )

    # ──────────────────────────────────────────
    # Block 建構輔助
    # ──────────────────────────────────────────

    @staticmethod
    def p(text: str) -> dict:
        return {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": text}}]},
        }

    @staticmethod
    def h2(text: str) -> dict:
        return {
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [{"type": "text", "text": {"content": text}}]},
        }

    @staticmethod
    def q(text: str) -> dict:
        return {
            "object": "block",
            "type": "quote",
            "quote": {"rich_text": [{"type": "text", "text": {"content": text}}]},
        }


# ──────────────────────────────────────────────────────────────────────────────
# 使用範例（以下是每次寫批次腳本的標準寫法）
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os

    env = open("/Users/jay049/Code/makesense-ink/.env.local").read()
    TOKEN = [l for l in env.split("\n") if "NOTION_API_KEY" in l][0].split("=", 1)[1].strip().strip('"')

    writer = HihiWriter(TOKEN)
    p, h2, q = writer.p, writer.h2, writer.q

    # ── 範例：單篇文章 ──────────────────────────────────────────
    ARTICLES = [
        {
            "page_id": "XXXXX",           # DB05 page ID
            "db06_writer_id": "YYYYY",    # ⑥文案 的 DB06 管考 ID
            "title": "一月：...",
            "word_target_min": 600,
            "word_target_max": 800,
            "blocks": [
                h2("開頭標題"),
                p("第一段正文..."),
                p("第二段正文..."),
                q("引言..."),
                p("結尾..."),
            ],
        },
        # 繼續加 article...
    ]

    failed = []

    for art in ARTICLES:
        print(f"\n=== {art['title']} ===")

        result = writer.write_article(
            page_id=art["page_id"],
            blocks=art["blocks"],
            word_target_min=art["word_target_min"],
            word_target_max=art["word_target_max"],
            title=art["title"],
        )

        if result["success"]:
            # 驗證通過 → 標記完成
            writer.mark_ai_wenas_complete(art["page_id"])
            writer.mark_db06_complete(art["db06_writer_id"])
            print(f"  → ai文案=完成，DB06 管考已勾")
        else:
            # 未達標 → 記錄，不標記完成
            writer.write_failure_note(art["page_id"], result["note"])
            failed.append(art["title"])
            print(f"  → 未標記完成，failure note 已寫入")

    print("\n\n=== 執行結果 ===")
    print(f"成功：{len(ARTICLES) - len(failed)} 篇")
    if failed:
        print(f"未達標（需人工補寫）：")
        for t in failed:
            print(f"  - {t}")
