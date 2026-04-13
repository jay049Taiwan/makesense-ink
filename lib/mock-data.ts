/**
 * 假資料系統 — 本地 dev 環境用
 * 三個角色各有完整的互動數據
 */

// ═══════════════════════════════════════════
// 商品目錄（旅人書店的商品）
// ═══════════════════════════════════════════
export const MOCK_PRODUCTS = [
  { id: "p1", name: "蘭東案內 04期", price: 250, author: "旅人書店", publisher: "旅人書店", category: "書籍", topics: ["蘭東案內", "地方誌"], photo: null, stock: 15, sku: "9789866215773" },
  { id: "p2", name: "蘭東案內 05期", price: 250, author: "旅人書店", publisher: "旅人書店", category: "書籍", topics: ["蘭東案內", "地方誌"], photo: null, stock: 8, sku: "9789866215780" },
  { id: "p3", name: "蘭東案內 06期 小鎮麵包地圖", price: 280, author: "旅人書店", publisher: "旅人書店", category: "書籍", topics: ["蘭東案內", "飲食文化"], photo: null, stock: 12, sku: "9789866215797" },
  { id: "p4", name: "宜蘭金牌旅遊王", price: 259, originalPrice: 299, author: "黃育智", publisher: "玉山社", category: "書籍", topics: ["旅遊文學", "宜蘭故事"], photo: null, stock: 0, sku: "9789862890684" },
  { id: "p5", name: "加購宜蘭街散步圖", price: 50, author: "旅人書店", publisher: "旅人書店", category: "商品", topics: ["城鎮散步"], photo: null, stock: 45, sku: "MAP001" },
  { id: "p6", name: "散步宜蘭街貼紙", price: 30, author: "—", publisher: "旅人書店", category: "商品", topics: ["城鎮散步"], photo: null, stock: 100, sku: "STK001" },
  { id: "p7", name: "木作匙叉 35", price: 350, author: "—", publisher: "木匠兄妹", category: "商品", topics: ["手作工藝"], photo: null, stock: 0, sku: "WOOD035" },
  { id: "p8", name: "手作繪圖木掛勾", price: 280, author: "—", publisher: "木匠兄妹", category: "商品", topics: ["手作工藝"], photo: null, stock: 0, sku: "WOOD036" },
  { id: "p9", name: "教練我想打球", price: 320, author: "井上雄彥", publisher: "尖端", category: "書籍", topics: ["漫畫", "運動"], photo: null, stock: 0, sku: "9789571099999" },
  { id: "p10", name: "旅行的意義", price: 380, originalPrice: 450, author: "詹宏志", publisher: "新經典", category: "書籍", topics: ["旅遊文學"], photo: null, stock: 0, sku: "9789865824999" },
];

// ═══════════════════════════════════════════
// 活動（旅人書店 / 宜蘭文化俱樂部的活動）
// ═══════════════════════════════════════════
export const MOCK_ACTIVITIES = [
  { id: "a1", title: "走讀行旅｜宜蘭舊城散步", date: "2026/04/21", type: "走讀行旅", price: 500, capacity: 20, registered: 14, vendor: "旅人書店" },
  { id: "a2", title: "走讀行旅｜羅東林場文學散步", date: "2026/05/05", type: "走讀行旅", price: 600, capacity: 15, registered: 8, vendor: "旅人書店" },
  { id: "a3", title: "講座｜宜蘭的前世今生", date: "2026/04/28", type: "講座", price: 300, capacity: 40, registered: 32, vendor: "旅人書店" },
  { id: "a4", title: "市集｜春日好物市集", date: "2026/05/10", type: "市集", price: 0, capacity: 200, registered: 156, vendor: "旅人書店" },
  { id: "a5", title: "走讀行旅｜冬山河自行車道", date: "2026/03/15", type: "走讀行旅", price: 500, capacity: 20, registered: 20, vendor: "旅人書店" },
];

// ═══════════════════════════════════════════
// 王大明的購買紀錄
// ═══════════════════════════════════════════
export const MOCK_MEMBER_PURCHASES = [
  { id: "ord1", productId: "p1", name: "蘭東案內 04期", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/04/06", price: 250, rating: 5, comment: "很棒的刊物！", category: "書籍", topics: ["蘭東案內", "地方誌"] },
  { id: "ord2", productId: "p4", name: "宜蘭金牌旅遊王", qty: 1, author: "黃育智", publisher: "玉山社", date: "2026/04/01", price: 259, rating: 4, comment: "內容豐富", category: "書籍", topics: ["旅遊文學", "宜蘭故事"] },
  { id: "ord3", productId: "p5", name: "加購宜蘭街散步圖", qty: 2, author: "旅人書店", publisher: "旅人書店", date: "2026/04/06", price: 50, rating: 0, comment: "", category: "商品", topics: ["城鎮散步"] },
  { id: "ord4", productId: "p6", name: "散步宜蘭街貼紙", qty: 3, author: "—", publisher: "旅人書店", date: "2026/03/28", price: 30, rating: 0, comment: "", category: "商品", topics: ["城鎮散步"] },
  { id: "ord5", productId: "p2", name: "蘭東案內 05期", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/03/20", price: 250, rating: 0, comment: "", category: "書籍", topics: ["蘭東案內", "地方誌"] },
  { id: "ord6", productId: "p3", name: "蘭東案內 06期 小鎮麵包地圖", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/03/10", price: 280, rating: 0, comment: "", category: "書籍", topics: ["蘭東案內", "飲食文化"] },
];

// 王大明的活動報名
export const MOCK_MEMBER_REGISTRATIONS = [
  { id: "reg1", activityId: "a1", title: "走讀行旅｜宜蘭舊城散步", date: "2026/04/21", type: "走讀行旅", price: 500, status: "已報名", rating: 0, comment: "" },
  { id: "reg2", activityId: "a5", title: "走讀行旅｜冬山河自行車道", date: "2026/03/15", type: "走讀行旅", price: 500, status: "已參加", rating: 5, comment: "路線很美！" },
  { id: "reg3", activityId: "a3", title: "講座｜宜蘭的前世今生", date: "2026/04/28", type: "講座", price: 300, status: "已報名", rating: 0, comment: "" },
];

// 王大明的消費統計
export function getMemberStats() {
  const totalSpent = MOCK_MEMBER_PURCHASES.reduce((s, p) => s + p.price * p.qty, 0)
    + MOCK_MEMBER_REGISTRATIONS.reduce((s, r) => s + r.price, 0);
  const totalItems = MOCK_MEMBER_PURCHASES.reduce((s, p) => s + p.qty, 0);
  const totalEvents = MOCK_MEMBER_REGISTRATIONS.length;
  const points = Math.floor(totalSpent / 10); // 每消費 10 元得 1 點
  return { totalSpent, totalItems, totalEvents, points, level: points >= 200 ? "Lv.3" : points >= 100 ? "Lv.2" : "Lv.1" };
}

// ═══════════════════════════════════════════
// 三個角色的 profile（DevRoleProvider 使用）
// ═══════════════════════════════════════════
export const MOCK_PROFILES = {
  member: {
    displayName: "王大明",
    email: "wangdaming@gmail.com",
    phone: "0912-345-678",
    lineUid: "U1234567890abcdef",
    lineConnected: true,
  },
  staff: {
    displayName: "林四九",
    email: "jay049@gmail.com",
    phone: "0988-049-049",
    lineUid: "U1238838c4a865f4160f974802671a2f8",
    lineConnected: true,
  },
  vendor: {
    displayName: "旅人書店",
    email: "travelerbookstore@gmail.com",
    phone: "039-325957",
    lineUid: "",
    lineConnected: false,
  },
};
