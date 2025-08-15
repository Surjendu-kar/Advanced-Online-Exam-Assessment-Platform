import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UserProfile } from "../../types/database";

export interface TeacherAuthResult {
  success: boolean;
  user: { id: string; email: string; profile: UserProfile };
  response: NextResponse;
}

/**
 * Verify teacher authentication and authorization
 * Allows both teachers and admins to access teacher endpoints
 */
export async function verifyTeacherAuth(
  request: NextRequest
): Promise<TeacherAuthResult> {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  try {
    // Get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        user: null as any,
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ),
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        user: null as any,
        response: NextResponse.json(
          { error: "User profile not found" },
          { status: 404 }
        ),
      };
    }

    // Check if user is teacher or admin
    if (!["teacher", "admin"].includes(profile.role)) {
      return {
        success: false,
        user: null as any,
        response: NextResponse.json(
          { error: "Teacher access required" },
          { status: 403 }
        ),
      };
    }

    // Check if user is verified
    if (!profile.verified) {
      return {
        success: false,
        user: null as any,
        response: NextResponse.json(
          { error: "Account not verified" },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email!,
        profile,
      },
      response,
    };
  } catch (error) {
    console.error("Teacher auth error:", error);
    return {
      success: false,
      user: null as any,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}
