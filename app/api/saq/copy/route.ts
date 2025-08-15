import { NextRequest, NextResponse } from "next/server";
import { SAQService } from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/saq/copy - Copy SAQ question to another exam
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { saq_id, target_exam_id } = body;

    if (!saq_id || !target_exam_id) {
      return NextResponse.json(
        { error: "SAQ ID and target exam ID are required" },
        { status: 400 }
      );
    }

    const copiedSAQ = await SAQService.copySAQToExam(
      user.id,
      saq_id,
      target_exam_id
    );

    return NextResponse.json({
      data: copiedSAQ,
      message: "SAQ question copied successfully",
    });
  } catch (error) {
    console.error("POST /api/saq/copy error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SAQ_NOT_FOUND"
          ? 404
          : error.code === "EXAM_ACCESS_DENIED"
          ? 403
          : 400;
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
