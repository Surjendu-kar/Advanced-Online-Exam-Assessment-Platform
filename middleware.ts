import { NextRequest } from "next/server";
import { authMiddleware, RouteGuard } from "./lib/middleware/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define route patterns and their protection levels
  if (pathname.startsWith("/admin")) {
    return RouteGuard.admin(request);
  }

  if (
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/dashboard/teacher")
  ) {
    return RouteGuard.teacher(request);
  }

  if (
    pathname.startsWith("/student") ||
    pathname.startsWith("/dashboard/student")
  ) {
    return RouteGuard.student(request);
  }

  if (pathname.startsWith("/exam/")) {
    return RouteGuard.authenticated(request);
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings")
  ) {
    return RouteGuard.authenticated(request);
  }

  // Default auth middleware for other protected routes
  return authMiddleware(request, {
    publicRoutes: [
      "/",
      "/login",
      "/register",
      "/unauthorized",
      "/api/auth/callback",
    ],
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
