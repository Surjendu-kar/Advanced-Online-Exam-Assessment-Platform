import { NextRequest, NextResponse } from "next/server";
import { ExamSessionService } from "../../../../lib/services/examSessionService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/exam-sessions/[sessionId] - Get exam session details
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

    const session = await ExamSessionService.getExamSession(
      user.id,
      params.sessionId
    );

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: session,
    });
  } catch (error) {
    console.error("GET /api/exam-sessions/[sessionId] error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "SESSION_NOT_FOUND" ? 404 : 400;
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
 * POST /api/exam-sessions/[sessionId] - Submit exam
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

    const session = await ExamSessionService.submitExam(
      user.id,
      params.sessionId
    );

    return NextResponse.json({
      data: session,
      message: "Exam submitted successfully",
    });
  } catch (error) {
    console.error("POST /api/exam-sessions/[sessionId] error:", error);

    if (error instanceof SupabaseError) {
      let statusCode = 400;

      switch (error.code) {
        case "SESSION_NOT_FOUND":
          statusCode = 404;
          break;
        case "EXAM_ALREADY_SUBMITTED":
        case "EXAM_TERMINATED":
          statusCode = 403;
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
