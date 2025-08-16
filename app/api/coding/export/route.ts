import { NextRequest, NextResponse } from "next/server";
import { CodingService } from "../../../../lib/services/codingService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/coding/export - Export coding questions for an exam
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("exam_id");

    if (!examId) {
      return NextResponse.json(
        { error: "exam_id parameter is required" },
        { status: 400 }
      );
    }

    const exportedCodings = await CodingService.exportCodings(user.id, examId);

    return NextResponse.json({
      data: exportedCodings,
      message: `${exportedCodings.length} coding questions exported successfully`,
    });
  } catch (error) {
    console.error("GET /api/coding/export error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "EXAM_ACCESS_DENIED" ? 403 : 400;
      return NextResponse.json(
        { error: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
