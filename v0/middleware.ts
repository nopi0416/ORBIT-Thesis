import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page and public assets
  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Check for session in cookie (in production, use httpOnly cookies)
  // For this demo, we'll check localStorage on the client side
  // In production, implement proper server-side session validation

  // Protected routes
  if (pathname.startsWith("/dashboard")) {
    // In production, validate session token here
    // For now, allow access (client-side will handle redirect)
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
