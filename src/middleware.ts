import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("auth")?.value === "true";
  const username = request.cookies.get("username")?.value;

  // Protected routes that require authentication
  const protectedPaths = ["/passkeys"];
  const isProtectedPath = protectedPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      (request.nextUrl.pathname.startsWith(path + "/") &&
        !request.nextUrl.pathname.startsWith("/passkeys/auth"))
  );

  // Auth pages that should redirect if already authenticated
  const authPaths = ["/passkeys/auth"];
  const isAuthPath = authPaths.some(
    (path) => request.nextUrl.pathname === path
  );

  // Skip middleware for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated && username) {
    return NextResponse.redirect(new URL("/passkeys", request.url));
  }

  // Redirect unauthenticated users to auth page
  if (isProtectedPath && (!isAuthenticated || !username)) {
    return NextResponse.redirect(new URL("/passkeys/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/passkeys", "/passkeys/auth", "/passkeys/:path*"],
};
