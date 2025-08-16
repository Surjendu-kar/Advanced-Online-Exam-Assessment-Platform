import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "../../../../lib/services/studentService";
import { AuthService } from "../../../../lib/auth";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * Get student's exam list with filtering
 * GET /api/student/exams?status=<status>&search=<search>&limit=<limit>&offset=<offset>
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "upcoming"
      | "active"
      | "completed"
      | "missed"
      | null;
    const search = searchParams.get("search");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    const exams = await StudentService.getStudentExams(user.id, {
      status: status || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: { exams },
    });
  } catch (error) {
    console.error("Get student exams error:", error);

    if (error instanceof SupabaseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get student exams" },
      { status: 500 }
    );
  }
}
