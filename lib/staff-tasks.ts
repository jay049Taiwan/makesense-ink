import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DS_DB03 = process.env.NOTION_DB03_PROGRESS!;       // 968b23ea-...
const DS_DB04 = process.env.NOTION_DB04_COLLABORATION!;  // 5ad63416-...
const DS_DB05 = process.env.NOTION_DB05_REGISTRATION!;   // 28a667a9-...

export type TaskItem = {
  id: string;
  db: "DB03" | "DB04" | "DB05";
  title: string;
  executionStatus?: string;
  reviewStatus?: string;
  assignees?: string[];
  assigneeEmails?: string[];
  startTime?: string;
  deadline?: string;
  executionTime?: string;
  topicName?: string;
  crossSummary?: string;
  handoverNote?: string;
  handoverReply?: string;
  taskType?: string;
  type?: string;
  content?: string;
  checkOption?: string;
  attrSummary?: string;
  quantity?: number | null;
  unitPrice?: number | null;
  subtotal?: number | null;
  cash?: Record<string, number | null>;
  childRelations?: string[];
  parentRelations?: string[];
  children?: TaskItem[];
};

const getTitle = (p: any) => p?.title?.map((t: any) => t.plain_text).join("") || "";
const getRichText = (p: any) => p?.rich_text?.map((t: any) => t.plain_text).join("") || "";
const getSelect = (p: any) => p?.select?.name || "";
const getStatus = (p: any) => p?.status?.name || "";
const getDate = (p: any) => p?.date?.start || "";
const getNumber = (p: any) => p?.number ?? null;
const getRelationIds = (p: any) => (p?.relation || []).map((r: any) => r.id);
const getPeopleNames = (p: any) => (p?.people || []).map((u: any) => u.name || "").filter(Boolean);
const getPeopleEmails = (p: any) => (p?.people || []).map((u: any) => u.person?.email || "").filter(Boolean);

export function extractDB04(page: any): TaskItem {
  const p = page.properties;
  return {
    id: page.id, db: "DB04",
    title: getTitle(p["交接名稱"]) || "（無標題）",
    executionStatus: getStatus(p["執行狀態"]),
    reviewStatus: getStatus(p["檢核狀態"]),
    assignees: getPeopleNames(p["責任執行"]),
    startTime: getDate(p["起算時間"]),
    deadline: getDate(p["截止時間"]),
    executionTime: getDate(p["執行時間"]),
    topicName: getRichText(p["主題名稱"]),
    crossSummary: p["跨類摘要"]?.formula?.string || getRichText(p["跨類摘要"]) || "",
    handoverNote: getRichText(p["交接備註"]),
    handoverReply: getRichText(p["交接回覆"]),
    taskType: getSelect(p["交接類型"]),
    childRelations: getRelationIds(p["對應明細"]),
    parentRelations: getRelationIds(p["對應項目"]),
  };
}

export function extractDB05(page: any): TaskItem {
  const p = page.properties;
  return {
    id: page.id, db: "DB05",
    title: getTitle(p["表單名稱"]) || "（無標題）",
    content: getRichText(p["明細內容"]),
    executionStatus: getStatus(p["執行狀態"]),
    reviewStatus: getStatus(p["檢核狀態"]),
    type: getSelect(p["表單類型"]),
    assignees: getPeopleNames(p["責任執行"]),
    assigneeEmails: getPeopleEmails(p["責任執行"]),
    deadline: getDate(p["截止時間"]),
    topicName: getRichText(p["主題名稱"]),
    crossSummary: p["跨類摘要"]?.formula?.string || getRichText(p["跨類摘要"]) || "",
    handoverNote: getRichText(p["交接備註"]),
    handoverReply: getRichText(p["交接回覆"]),
    checkOption: getSelect(p["點交選項"]),
    attrSummary: p["屬性整合"]?.formula?.string || p["屬性整合"]?.formula?.number?.toString() || "",
    quantity: getNumber(p["登記數量"]),
    unitPrice: getNumber(p["登記單價"]),
    subtotal: p["小計"]?.formula?.number ?? null,
    parentRelations: getRelationIds(p["對應協作"]),
    cash: {
      open1000: getNumber(p["開店仟元"]), open500: getNumber(p["開店500元"]),
      open100: getNumber(p["開店佰元"]), open50: getNumber(p["開店50元"]),
      open10: getNumber(p["開店拾元"]), open5: getNumber(p["開店5元"]),
      open1: getNumber(p["開店壹元"]),
      close1000: getNumber(p["打烊仟元"]), close500: getNumber(p["打烊500元"]),
      close100: getNumber(p["打烊佰元"]), close50: getNumber(p["打烊50元"]),
      close10: getNumber(p["打烊拾元"]), close5: getNumber(p["打烊5元"]),
      close1: getNumber(p["打烊壹元"]),
    },
  };
}

export function extractDB03(page: any): TaskItem {
  const p = page.properties;
  return {
    id: page.id, db: "DB03",
    title: getTitle(p["項目名稱"]) || "（無標題）",
    executionStatus: getStatus(p["執行狀態"]),
    childRelations: getRelationIds(p["對應交接"]),
  };
}

const queryDS = (dsId: string, filter: any, pageSize: number) =>
  notion.dataSources.query({
    data_source_id: dsId,
    filter,
    page_size: pageSize,
    sorts: [{ property: "更新時間", direction: "descending" }],
  } as any).catch((e: any) => { console.warn("[staff-tasks] query error:", e.message); return { results: [] } as any; });

export async function fetchTasksFromNotion(notionUserId: string) {
  const pendingFilter = {
    and: [
      { property: "責任執行", people: { contains: notionUserId } },
      { property: "執行狀態", status: { does_not_equal: "已完成" } },
    ],
  };
  const doneNotReviewedFilter = {
    and: [
      { property: "責任執行", people: { contains: notionUserId } },
      { property: "執行狀態", status: { equals: "已完成" } },
      { property: "檢核狀態", status: { does_not_equal: "檢核ok" } },
    ],
  };

  const [db03P, db03D, db04P, db04D, db05P, db05D] = await Promise.all([
    queryDS(DS_DB03, pendingFilter, 50),
    queryDS(DS_DB03, doneNotReviewedFilter, 20),
    queryDS(DS_DB04, pendingFilter, 100),
    queryDS(DS_DB04, doneNotReviewedFilter, 50),
    queryDS(DS_DB05, pendingFilter, 100),
    queryDS(DS_DB05, doneNotReviewedFilter, 50),
  ]);

  const merge = (a: any, b: any) => {
    const ids = new Set(a.results.map((r: any) => r.id));
    return [...a.results, ...b.results.filter((r: any) => !ids.has(r.id))];
  };
  const db03Res = merge(db03P, db03D);
  const db04Res = merge(db04P, db04D);
  const db05Res = merge(db05P, db05D);

  const db03Tasks = db03Res.map(extractDB03);
  const db04Tasks = db04Res.map(extractDB04);
  const db05Tasks = db05Res.map(extractDB05);

  const db04Map = Object.fromEntries(db04Tasks.map((t: TaskItem) => [t.id, t]));
  const db05Map = Object.fromEntries(db05Tasks.map((t: TaskItem) => [t.id, t]));

  for (const t4 of db04Tasks) {
    t4.children = (t4.childRelations || []).filter((id: string) => db05Map[id]).map((id: string) => db05Map[id]);
  }
  for (const t3 of db03Tasks) {
    t3.children = (t3.childRelations || []).filter((id: string) => db04Map[id]).map((id: string) => db04Map[id]);
  }

  const attachedDb04Ids = new Set(db03Tasks.flatMap((t: TaskItem) => t.childRelations || []));
  const orphanDb04 = db04Tasks.filter((t: TaskItem) => !attachedDb04Ids.has(t.id));
  const attachedDb05Ids = new Set(db04Tasks.flatMap((t: TaskItem) => t.childRelations || []));
  const orphanDb05 = db05Tasks.filter((t: TaskItem) => !attachedDb05Ids.has(t.id));

  return {
    tree: db03Tasks,
    orphanTasks: orphanDb04,
    orphanDetails: orphanDb05,
    counts: { db03: db03Tasks.length, db04: db04Tasks.length, db05: db05Tasks.length },
    notionUserId,
  };
}

export async function fetchDB05Children(taskId: string): Promise<TaskItem[]> {
  const results: any[] = [];
  let startCursor: string | undefined = undefined;
  while (true) {
    const query: any = {
      data_source_id: DS_DB05,
      filter: { property: "對應協作", relation: { contains: taskId } },
      page_size: 100,
    };
    if (startCursor) query.start_cursor = startCursor;
    const response: any = await notion.dataSources.query(query)
      .catch((e: any) => { console.error("[staff-tasks] children query error:", e.message); return { results: [] }; });
    results.push(...(response.results || []));
    if (!response.has_more || !response.next_cursor) break;
    startCursor = response.next_cursor;
  }
  return results.map(extractDB05);
}

export async function updatePageProperties(pageId: string, properties: Record<string, any>) {
  return notion.pages.update({ page_id: pageId, properties });
}
