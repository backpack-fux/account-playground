import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add paths that don't require authentication
const publicPaths = ["/passkeys/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is public
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const isAuthenticated = request.cookies.has("auth");
  if (!isAuthenticated && !pathname.startsWith("/api/")) {
    // Redirect to auth page if not authenticated
    return NextResponse.redirect(new URL("/passkeys/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
