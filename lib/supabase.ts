import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Supabase client（anon key）— 用於前端和公開讀取 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase admin client（service_role key）— 只用於 server-side API routes 的寫入操作
 * 繞過 RLS，用於 sync、checkout 等需要寫入的 API
 * 注意：絕對不能暴露到前端（不用 NEXT_PUBLIC_ 前綴）
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : supabase; // fallback 到 anon（service_role key 未設定時）
