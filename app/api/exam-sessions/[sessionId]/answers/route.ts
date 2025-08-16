import { NextRequest, NextResponse } from "next/server";
import {
  ExamSessionService,
  SubmitMCQAnswerRequest,
} from "../../../../../lib/services/examSessionService";
import { SupabaseError } from "../../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/exam-sessions/[sessionId]/answers - Submit MCQ answer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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
    const answerData: SubmitMCQAnswerRequest = {
      session_id: params.sessionId,
      question_id: body.question_id,
      selected_option: body.selected_option,
    };

    const updatedQuestion = await ExamSessionService.submitMCQAnswer(
      user.id,
      answerData
    );

    return NextResponse.json({
      data: updatedQuestion,
      message: "Answer submitted successfully",
    });
  } catch (error) {
    console.error("POST /api/exam-sessions/[sessionId]/answers error:", error);

    if (error instanceof SupabaseError) {
      let statusCode = 400;

      switch (error.code) {
        case "SESSION_NOT_FOUND":
        case "QUESTION_NOT_FOUND":
          statusCode = 404;
          break;
        case "SESSION_NOT_ACTIVE":
        case "EXAM_TIME_EXPIRED":
          statusCode = 403;
          break;
        case "INVALID_OPTION":
          statusCode = 400;
          break;
      }

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
