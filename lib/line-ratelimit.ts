import { supabaseAdmin as supabase } from "./supabase";

/** 每人每天最多收到的推播數 */
const DAILY_PUSH_LIMIT = 5;

/** 每月推播總上限（接近時停止非必要推播） */
const MONTHLY_PUSH_CAP = 450; // 留 50 則緩衝給必要通知

/** AI 回覆節流：同一用戶每分鐘最多幾則 */
const AI_REPLY_PER_MINUTE = 3;

/**
 * 檢查用戶今天是否還能收推播
 */
export async function checkPushLimit(lineUid: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 查今天已推播幾則
  const { count } = await supabase
    .from("line_message_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", lineUid)
    .eq("message_type", "push")
    .gte("created_at", todayStart.toISOString());

  if ((count || 0) >= DAILY_PUSH_LIMIT) {
    console.warn(`[ratelimit] User ${lineUid.slice(0, 10)}... hit daily push limit (${count}/${DAILY_PUSH_LIMIT})`);
    return false;
  }

  return true;
}

/**
 * 檢查本月推播總量是否接近上限
 * 返回 { allowed, count, cap }
 */
export async function checkMonthlyPushCap(): Promise<{ allowed: boolean; count: number; cap: number }> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("line_message_log")
    .select("id", { count: "exact", head: true })
    .eq("message_type", "push")
    .gte("created_at", monthStart.toISOString());

  const current = count || 0;
  return {
    allowed: current < MONTHLY_PUSH_CAP,
    count: current,
    cap: MONTHLY_PUSH_CAP,
  };
}

/**
 * AI 回覆節流：檢查用戶最近 1 分鐘內的回覆次數
 */
export async function checkAiReplyThrottle(lineUid: string): Promise<boolean> {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);

  const { count } = await supabase
    .from("line_message_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", lineUid)
    .eq("template", "chat")
    .gte("created_at", oneMinAgo.toISOString());

  if ((count || 0) >= AI_REPLY_PER_MINUTE) {
    return false;
  }

  return true;
}
