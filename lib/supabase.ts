/**
 * Supabase 客户端（浏览器端）
 *
 * 使用 @supabase/ssr 的 createBrowserClient
 * Session 通过 cookie 存储，与服务端 middleware 共享
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
