import { NextRequest, NextResponse } from "next/server";
import { MCQService } from "../../../../lib/services/mcqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/mcq/copy - Copy MCQ question to another exam
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
    const { mcq_id, target_exam_id } = body;

    if (!mcq_id || !target_exam_id) {
      return NextResponse.json(
        { error: "MCQ ID and target exam ID are required" },
        { status: 400 }
      );
    }

    const copiedMCQ = await MCQService.copyMCQToExam(
      user.id,
      mcq_id,
      target_exam_id
    );

    return NextResponse.json(
      {
        data: copiedMCQ,
        message: "MCQ question copied successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/mcq/copy error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "MCQ_NOT_FOUND"
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
