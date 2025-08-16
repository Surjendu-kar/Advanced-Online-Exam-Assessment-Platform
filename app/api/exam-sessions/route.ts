import { NextRequest, NextResponse } from "next/server";
import {
  ExamSessionService,
  StartExamSessionRequest,
} from "../../../lib/services/examSessionService";
import { SupabaseError } from "../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/exam-sessions - Start a new exam session
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
    const sessionData: StartExamSessionRequest = {
      exam_id: body.exam_id,
      invitation_token: body.invitation_token,
      exam_code: body.exam_code,
    };

    const session = await ExamSessionService.startExamSession(
      user.id,
      sessionData
    );

    return NextResponse.json(
      {
        data: session,
        message: "Exam session started successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/exam-sessions error:", error);

    if (error instanceof SupabaseError) {
      let statusCode = 400;

      switch (error.code) {
        case "EXAM_NOT_FOUND":
        case "QUESTION_NOT_FOUND":
          statusCode = 404;
          break;
        case "EXAM_NOT_STARTED":
        case "EXAM_ENDED":
        case "EXAM_ALREADY_COMPLETED":
        case "EXAM_TERMINATED":
        case "INVALID_INVITATION":
        case "INVITATION_EXPIRED":
        case "INVALID_EXAM_CODE":
          statusCode = 403;
          break;
        case "INVITATION_REQUIRED":
          statusCode = 401;
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
