import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * env 缺失時用 placeholder 值，讓 createClient 不會在 build 階段同步 throw。
 * 真正的查詢仍會失敗（回傳 error），但 fetch-supabase.ts 等呼叫端會優雅處理（回傳空陣列）。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Lazy 初始化：createClient 只在第一次實際使用時才呼叫，
 * 避免 build 階段（collect page data）載入模組時就因缺少 env 變數而 crash。
 */
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : getSupabase(); // fallback 到 anon（service_role key 未設定時）
  }
  return _supabaseAdmin;
}

function lazyClient(resolve: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = resolve();
      const value = Reflect.get(client, prop);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

/** Supabase client（anon key）— 用於前端和公開讀取 */
export const supabase = lazyClient(getSupabase);

/**
 * Supabase admin client（service_role key）— 只用於 server-side API routes 的寫入操作
 * 繞過 RLS，用於 sync、checkout 等需要寫入的 API
 * 注意：絕對不能暴露到前端（不用 NEXT_PUBLIC_ 前綴）
 */
export const supabaseAdmin = lazyClient(getSupabaseAdmin);
