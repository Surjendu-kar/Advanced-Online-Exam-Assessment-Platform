import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "../../../../lib/services/studentService";
import { AuthService } from "../../../../lib/auth";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * Validate exam access for a student
 * POST /api/student/exam-access
 * Body: { examId: string }
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
    const { examId } = body;

    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    const validation = await StudentService.validateExamAccess(user.id, examId);

    return NextResponse.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error("Exam access validation error:", error);

    if (error instanceof SupabaseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate exam access" },
      { status: 500 }
    );
  }
}
