import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 不需要登录保护的页面
  const publicPaths = ['/login', '/test-supabase', '/auth/callback'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return supabaseResponse
  }

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log('[Proxy] getUser:', { user: user?.email })

  // 如果没登录，重定向到登录页
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 将 userId 写入 header，传递给下游 API Route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
