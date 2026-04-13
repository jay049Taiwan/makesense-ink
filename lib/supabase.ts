import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Supabase client — 用於 API routes（server-side） */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
