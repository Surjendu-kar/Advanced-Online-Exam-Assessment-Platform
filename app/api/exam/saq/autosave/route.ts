import { NextRequest, NextResponse } from "next/server";
import {
  SAQExamService,
  AutoSaveSAQRequest,
} from "../../../../lib/services/saqExamService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/exam/saq/autosave - Auto-save SAQ answer draft
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
    const saveData: AutoSaveSAQRequest = {
      session_id: body.session_id,
      question_id: body.question_id,
      answer_text: body.answer_text,
    };

    const saq = await SAQExamService.autoSaveSAQAnswer(user.id, saveData);

    return NextResponse.json({
      data: saq,
      message: "SAQ answer auto-saved successfully",
    });
  } catch (error) {
    console.error("POST /api/exam/saq/autosave error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SESSION_NOT_FOUND" ||
        error.code === "QUESTION_NOT_FOUND"
          ? 404
          : error.code === "SESSION_NOT_ACTIVE" ||
            error.code === "EXAM_TIME_EXPIRED"
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