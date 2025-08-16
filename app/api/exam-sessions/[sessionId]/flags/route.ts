import { NextRequest, NextResponse } from "next/server";
import {
  QuestionFlagService,
  FlagQuestionRequest,
} from "../../../../../lib/services/questionFlagService";
import { SupabaseError } from "../../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/exam-sessions/[sessionId]/flags - Get flagged questions
 */
export async function GET(
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

    const flags = await QuestionFlagService.getFlaggedQuestions(
      user.id,
      params.sessionId
    );

    return NextResponse.json({
      data: flags,
    });
  } catch (error) {
    console.error("GET /api/exam-sessions/[sessionId]/flags error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "SESSION_ACCESS_DENIED" ? 403 : 400;
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

/**
 * POST /api/exam-sessions/[sessionId]/flags - Flag/unflag a question
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
    const flagData: FlagQuestionRequest = {
      session_id: params.sessionId,
      question_id: body.question_id,
      question_type: body.question_type || "mcq",
      is_flagged: body.is_flagged,
    };

    const flag = await QuestionFlagService.flagQuestion(user.id, flagData);

    return NextResponse.json({
      data: flag,
      message: flagData.is_flagged
        ? "Question flagged successfully"
        : "Question unflagged successfully",
    });
  } catch (error) {
    console.error("POST /api/exam-sessions/[sessionId]/flags error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "SESSION_ACCESS_DENIED" ? 403 : 400;
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

/**
 * DELETE /api/exam-sessions/[sessionId]/flags - Clear all flags
 */
export async function DELETE(
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

    await QuestionFlagService.clearSessionFlags(user.id, params.sessionId);

    return NextResponse.json({
      message: "All flags cleared successfully",
    });
  } catch (error) {
    console.error("DELETE /api/exam-sessions/[sessionId]/flags error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "SESSION_ACCESS_DENIED" ? 403 : 400;
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
