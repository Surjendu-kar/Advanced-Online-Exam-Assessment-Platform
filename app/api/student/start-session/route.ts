import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "../../../../lib/services/studentService";
import { AuthService } from "../../../../lib/auth";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * Start exam session
 * POST /api/student/start-session
 * Body: { sessionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is a student
    if (user.profile?.role !== "student") {
      return NextResponse.json(
        { error: "Student access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await StudentService.startExamSession(user.id, sessionId);

    return NextResponse.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    console.error("Start session error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SESSION_NOT_FOUND" ||
        error.code === "SESSION_ALREADY_STARTED" ||
        error.code === "ACCESS_DENIED"
          ? 400
          : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to start exam session" },
      { status: 500 }
    );
  }
}
