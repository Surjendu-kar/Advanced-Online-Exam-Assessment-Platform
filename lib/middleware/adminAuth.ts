import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../auth";
import { AdminService } from "../services/adminService";

export interface AdminAuthContext {
  user: {
    id: string;
    email: string;
    role: "admin";
  };
}

/**
 * Middleware to verify admin authentication and authorization
 */
export async function verifyAdminAuth(
  request: NextRequest
): Promise<
  | { success: true; user: AdminAuthContext["user"] }
  | { success: false; response: NextResponse }
> {
  try {
    // Get current user from session
    const currentUser = await AuthService.getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ),
      };
    }

    // Verify user has admin role
    if (!currentUser.profile?.role || currentUser.profile.role !== "admin") {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        ),
      };
    }

    // Verify admin role in database (additional security check)
    const isAdmin = await AdminService.verifyAdminRole(currentUser.id);
    if (!isAdmin) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user: {
        id: currentUser.id,
        email: currentUser.email || "",
        role: "admin",
      },
    };
  } catch (error) {
    console.error("Admin auth verification error:", error);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap API routes with admin authentication
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (
    request: NextRequest,
    context: AdminAuthContext,
    ...args: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await verifyAdminAuth(request);

    if (!authResult.success) {
      return authResult.response;
    }

    const context: AdminAuthContext = {
      user: authResult.user,
    };

    return handler(request, context, ...args);
  };
}

/**
 * Utility function to check if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser?.profile?.role) {
      return false;
    }

    return currentUser.profile.role === "admin";
  } catch {
    return false;
  }
}
