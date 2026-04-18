/**
 * Supabase Admin 客户端（服务端使用）
 *
 * 功能：绕过 RLS， 用于 API 路由中的服务端操作
 * 环境变量：SUPABASE_SERVICE_ROLE_KEY（从 .env.local 注入）
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
