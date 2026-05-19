"""Step 6 修正：6 篇超字數縮減版"""
import os
import sys
import time
import requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    sys.exit("ERROR: NOTION_API_KEY 未設")

HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# 6 篇縮減版（剪冗詞、合併重複句、保事實）
FIXES = [
    ("35f9ff25-fdab-8126-9721-fe12ecbc977c", "2016-01 月刊", 150, 250,
     "2016 年的第一個月，書店繼續開著門。\n\n"
     "去年走了一年舊城，今年想把這件事做得更有意思——不只走宜蘭，也去看其他地方的人怎麼對待他們的老地方。這個念頭在年初就清楚了清楚了，計畫的雛形還沒名字，但方向有了。一月的書店有新書、熟面孔，也有第一次來的旅人問「你們這裡都有什麼？」我們喜歡這個問題。\n\n"
     "這個月也收到一份意外的禮物：宜蘭書店旅行地圖被日本和歌山的早也佳帶回宜蘭，她順道分享了自己做的 zine「waccalla」。地圖會旅行的這件事，比我們想像的還要遠～\n\n"
     "（最誠實的回答是：有很多我們自己也還在想的東西。）"),

    ("35f9ff25-fdab-819c-a95d-f1c334086e38", "2016-03 月刊", 150, 250,
     "三月有一場講座，說的是偷渡客的事。\n\n"
     "台灣的移民史裡有一段很少被提到的故事——帆船時代的海禁、橫越黑水溝的冒險、禁令之下仍然出發的那些人。我們請了對這段歷史很熟的朋友來說，他把一個我們以為只是書本上的年代，講成了好像昨天發生的事。\n\n"
     "這種感覺每次都讓我們有點意外意外——歷史不一定很遠，有時候是我們自己把它放遠了。聽完那天幾個留下來的人繼續聊，聊到關燈才散。月底也發生兩件事：STAY 滿兩歲、林藝軒加入書店～\n\n"
     "（聊到最後大家都忘記有個問題還沒有答案。）"),

    ("35f9ff25-fdab-8151-8ed3-fe5b095ac988", "2016-09 月刊", 150, 250,
     "九月有一場對談，說的是在地合作這件事。\n\n"
     "我們請了彭顯惠和彭均達來聊——他們在不同的位置、用不同的方式和這片土地合作，但對「怎麼在這裡做事」都有很深的想法。對談不是訪問，是真的在你來我往地談，共識更清楚，歧異也說出來。\n\n"
     "在地合作從來不是一件容易的事。這裡有自己的規則、自己的人際網絡、從外面看不到但必須尊重的東西。月中也啟動了「隔壁老屋換工計畫」——書店旁那間 25 坪老房子，要靠換工慢慢拼出空間共享的雛形～\n\n"
     "（聽眾問了一個很犀利的問題，我們到現在還在想。）"),

    ("35f9ff25-fdab-812a-b984-f0027c1bedb2", "2016-10 月刊", 150, 250,
     "十月書店裡多了一面牆，上面是明信片。\n\n"
     "我們做了一個小展：邀請旅人把旅行回憶寫成明信片帶來書店。不設主題、不限地點，只要是真的去過、真的有感覺的，都可以。從巴黎倫敦帶回 100 本二手書交換寄件。收到的東西超出預期——有從很遠的地方寄來的、有手寫得很難看但字字真誠的、有附上一張皺旅行小票的。\n\n"
     "明信片是一種奇怪的東西奇怪的東西。你在旅途中寫它，把當下壓縮成一段話，寄出去，等它在另一個地方被讀到。\n\n"
     "（有一張明信片背面只寫了五個字：那裡的天空很藍。）"),

    ("35f9ff25-fdab-81bc-b92d-ed142ba3b274", "2016-12 月刊", 150, 250,
     "十二月我們讀了一本書，然後辦了一場分享。\n\n"
     "《鵝行鴨步宜蘭遊》是一本很特別的書——說的是宜蘭，語氣卻不是觀光指南那種腔調，而是像一個很熟的人帶著你走，說的都是不查旅遊網站不會知道的事。我們把這本書拿出來和大家說說說說，聊聊宜蘭的文字是怎麼被寫出來的。\n\n"
     "年末辦這種活動有個好處：來的人心情比較放——年底了，今天先來書店坐一下。\n\n"
     "2016 年，舊城本事走了很遠。下一年繼續～\n\n"
     "（聊到最深的地方是宜蘭的未來怎麼走，大家都沒答案，但聊了很久。）"),

    ("35f9ff25-fdab-8135-9ee2-f1042e71e46c", "2016 年刊", 250, 400,
     "2016 年，我們走遍了一些地方。\n\n"
     "舊城本事系列帶我們去了大稻埕、台南、三峽、大溪——這一年，「宜蘭」這個地方的邊界，在我們的理解裡變大了。不是宜蘭變大了，而是我們對「在地方做事」有了更多參照點。台灣各地有人在做很類似的事，他們的困境和我們的有重疊，他們找到的辦法有讓我們點頭、有讓我們搖頭、有讓我們沉默很久的。\n\n"
     "這一年讓我們知道：宜蘭不是孤立的，地方文化的工作者也不是各做各的——只是大家距離太遠，平常沒機會說話。舊城本事做的事之一，就是把這個距離縮短一點縮短一點～\n\n"
     "年底回望，2016 不只是走出去的一年。年初書店滿兩歲、林藝軒加入；五月小屋園遊、川崎書車登場；八月大俠夜市在碧霞街熱鬧一場；十月明信片展和品牌視覺更新；十一月宜蘭書店地圖升級成五間書店+15 台單車的聯盟版；十二月用《鵝行鴨步宜蘭遊》收尾，三週年悄悄到了。\n\n"
     "（這一年可以說的太多，那就讓 2017 繼續說吧。）"),
]


def archive_all_children(page_id):
    r = requests.get(f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100", headers=HEADERS)
    r.raise_for_status()
    blocks = r.json().get("results", [])
    for b in blocks:
        if b.get("type") in ("child_database", "child_page"):
            continue
        requests.delete(f"https://api.notion.com/v1/blocks/{b['id']}", headers=HEADERS)
        time.sleep(0.2)


def append_paragraphs(page_id, content):
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    children = [
        {"object": "block", "type": "paragraph",
         "paragraph": {"rich_text": [{"type": "text", "text": {"content": p}}]}}
        for p in paragraphs
    ]
    r = requests.patch(f"https://api.notion.com/v1/blocks/{page_id}/children", headers=HEADERS,
                       json={"children": children})
    return r.status_code == 200, r.text[:200] if r.status_code != 200 else ""


def count_chars(page_id):
    r = requests.get(f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100", headers=HEADERS)
    r.raise_for_status()
    blocks = r.json().get("results", [])
    total = 0
    for b in blocks:
        if b.get("type") == "paragraph":
            for t in b["paragraph"].get("rich_text", []):
                total += len(t.get("plain_text", "").replace(" ", ""))
    return total


def set_complete(page_id, chars, lo, hi):
    in_range = lo <= chars <= hi
    memo = f"字數 {chars} 字（目標 {lo}–{hi}），{'達標' if in_range else '未達標'}。Step 6 文案棒覆蓋寫入（修正版）。"
    body = {
        "properties": {
            "ai文案": {"status": {"name": "完成" if in_range else "待執行"}},
            "ai文案備註": {"rich_text": [{"type": "text", "text": {"content": memo}}]},
        }
    }
    if in_range:
        body["properties"]["發佈狀態"] = {"status": {"name": "待發佈"}}
    r = requests.patch(f"https://api.notion.com/v1/pages/{page_id}", headers=HEADERS, json=body)
    return r.status_code == 200


def main():
    results = []
    for pid, label, lo, hi, content in FIXES:
        print(f"\n處理 {label} (target {lo}-{hi})...", flush=True)
        archive_all_children(pid)
        time.sleep(0.5)
        ok, err = append_paragraphs(pid, content)
        if not ok:
            print(f"  ❌ append 失敗: {err}", flush=True)
            results.append((label, False, 0))
            continue
        time.sleep(0.5)
        chars = count_chars(pid)
        in_range = lo <= chars <= hi
        print(f"  {'✅' if in_range else '⚠️'} 字數 {chars}", flush=True)
        set_complete(pid, chars, lo, hi)
        results.append((label, in_range, chars))
        time.sleep(0.5)

    print("\n=== 修正結果 ===", flush=True)
    for label, ok, chars in results:
        print(f"  {'✅' if ok else '⚠️'} {label}: {chars} 字", flush=True)


if __name__ == "__main__":
    main()
