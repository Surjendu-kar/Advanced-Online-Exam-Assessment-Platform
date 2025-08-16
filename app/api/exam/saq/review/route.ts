import { NextRequest, NextResponse } from "next/server";
import {
  SAQExamService,
  ReviewSAQAnswerRequest,
} from "../../../../lib/services/saqExamService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * PUT /api/exam/saq/review - Review and grade SAQ answer
 */
export async function PUT(request: NextRequest) {
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
    const reviewData: ReviewSAQAnswerRequest = {
      session_id: body.session_id,
      question_id: body.question_id,
      answer_text: body.answer_text,
      marks_obtained: body.marks_obtained,
      grader_comments: body.grader_comments,
    };

    const saq = await SAQExamService.reviewSAQAnswer(user.id, reviewData);

    return NextResponse.json({
      data: saq,
      message: "SAQ answer reviewed successfully",
    });
  } catch (error) {
    console.error("PUT /api/exam/saq/review error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SESSION_NOT_FOUND" ||
        error.code === "ANSWER_NOT_FOUND"
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