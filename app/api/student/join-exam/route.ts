import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "../../../../lib/services/studentService";
import { AuthService } from "../../../../lib/auth";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * Join exam with code or invitation token
 * POST /api/student/join-exam
 * Body: { examCode?: string, invitationToken?: string }
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
    const { examCode, invitationToken } = body;

    if (!examCode && !invitationToken) {
      return NextResponse.json(
        { error: "Either exam code or invitation token is required" },
        { status: 400 }
      );
    }

    const session = await StudentService.joinExam(user.id, {
      examCode,
      invitationToken,
    });

    return NextResponse.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    console.error("Join exam error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "INVALID_EXAM_CODE" ||
        error.code === "INVALID_INVITATION" ||
        error.code === "ACCESS_DENIED"
          ? 400
          : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }

    return NextResponse.json({ error: "Failed to join exam" }, { status: 500 });
  }
}
