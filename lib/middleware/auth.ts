import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UserProfile } from "../../types/database";

export interface AuthMiddlewareOptions {
  requiredRole?: UserProfile["role"];
  allowedRoles?: UserProfile["role"][];
  redirectTo?: string;
  publicRoutes?: string[];
}

/**
 * Authentication middleware for route protection
 */
export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<NextResponse> {
  const {
    requiredRole,
    allowedRoles,
    redirectTo = "/login",
    publicRoutes = ["/login", "/register", "/"],
  } = options;

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(route + "/")
  );

  try {
    // Get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      if (!isPublicRoute) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      return response;
    }

    // If no session and route is protected, redirect to login
    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // If session exists and trying to access login/register, redirect to dashboard
    if (
      session &&
      (request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/register")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If no role requirements, allow access
    if (!requiredRole && !allowedRoles) {
      return response;
    }

    // Get user profile for role checking
    if (session) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Check role requirements
      if (requiredRole && profile.role !== requiredRole) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return response;
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }
}

/**
 * Role-based route protection utilities
 */
export class RouteGuard {
  /**
   * Protect admin routes
   */
  static admin(request: NextRequest): Promise<NextResponse> {
    return authMiddleware(request, {
      requiredRole: "admin",
      redirectTo: "/unauthorized",
    });
  }

  /**
   * Protect teacher routes
   */
  static teacher(request: NextRequest): Promise<NextResponse> {
    return authMiddleware(request, {
      allowedRoles: ["admin", "teacher"],
      redirectTo: "/unauthorized",
    });
  }

  /**
   * Protect student routes
   */
  static student(request: NextRequest): Promise<NextResponse> {
    return authMiddleware(request, {
      allowedRoles: ["student"],
      redirectTo: "/unauthorized",
    });
  }

  /**
   * Protect authenticated routes (any role)
   */
  static authenticated(request: NextRequest): Promise<NextResponse> {
    return authMiddleware(request, {
      redirectTo: "/login",
    });
  }

  /**
   * Custom role protection
   */
  static withRoles(
    roles: UserProfile["role"][]
  ): (request: NextRequest) => Promise<NextResponse> {
    return (request: NextRequest) =>
      authMiddleware(request, {
        allowedRoles: roles,
        redirectTo: "/unauthorized",
      });
  }
}

/**
 * Client-side route protection hook
 */
export interface UseAuthGuardOptions {
  requiredRole?: UserProfile["role"];
  allowedRoles?: UserProfile["role"][];
  redirectTo?: string;
  loading?: boolean;
}

export interface AuthGuardResult {
  isAuthorized: boolean;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any | null;
  role: UserProfile["role"] | null;
}

/**
 * Higher-order component for route protection
 * Note: This will be implemented in client-side components
 */
export function withAuthGuard<P extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WrappedComponent: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: UseAuthGuardOptions = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function AuthGuardedComponent(props: P) {
    // This will be implemented in the client-side components
    // For now, return the wrapped component
    // return <WrappedComponent {...props} />;
    return WrappedComponent;
  };
}

/**
 * Route matcher utilities
 */
export class RouteMatcher {
  /**
   * Check if route matches pattern
   */
  static matches(pathname: string, pattern: string): boolean {
    if (pattern === pathname) return true;
    if (pattern.endsWith("/*")) {
      const basePattern = pattern.slice(0, -2);
      return pathname.startsWith(basePattern);
    }
    return false;
  }

  /**
   * Get route patterns for different roles
   */
  static getRoutePatterns() {
    return {
      admin: ["/admin/*"],
      teacher: ["/teacher/*", "/dashboard/teacher/*"],
      student: ["/student/*", "/dashboard/student/*", "/exam/*"],
      public: ["/", "/login", "/register", "/unauthorized"],
      authenticated: ["/dashboard", "/profile", "/settings"],
    };
  }

  /**
   * Check if user can access route based on role
   */
  static canAccess(pathname: string, userRole: UserProfile["role"]): boolean {
    const patterns = this.getRoutePatterns();

    // Check public routes
    if (patterns.public.some((pattern) => this.matches(pathname, pattern))) {
      return true;
    }

    // Check role-specific routes
    switch (userRole) {
      case "admin":
        return (
          patterns.admin.some((pattern) => this.matches(pathname, pattern)) ||
          patterns.teacher.some((pattern) => this.matches(pathname, pattern)) ||
          patterns.authenticated.some((pattern) =>
            this.matches(pathname, pattern)
          )
        );

      case "teacher":
        return (
          patterns.teacher.some((pattern) => this.matches(pathname, pattern)) ||
          patterns.authenticated.some((pattern) =>
            this.matches(pathname, pattern)
          )
        );

      case "student":
        return (
          patterns.student.some((pattern) => this.matches(pathname, pattern)) ||
          patterns.authenticated.some((pattern) =>
            this.matches(pathname, pattern)
          )
        );

      default:
        return false;
    }
  }
}
