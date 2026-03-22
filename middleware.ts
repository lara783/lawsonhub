import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === "/login"
  const isPublicPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)

  if (isPublicPath) return NextResponse.next()

  // Check for Supabase auth cookie directly — no SDK, no network call
  const hasSession = request.cookies.has("sb-ijfsnbpxnysveqcgpitv-auth-token")

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
