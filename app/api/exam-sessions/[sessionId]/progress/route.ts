import { NextRequest, NextResponse } from "next/server";
import { ExamSessionService } from "../../../../../lib/services/examSessionService";
import { SupabaseError } from "../../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/exam-sessions/[sessionId]/progress - Get exam progress
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

    const progress = await ExamSessionService.getExamProgress(
      user.id,
      params.sessionId
    );

    return NextResponse.json({
      data: progress,
    });
  } catch (error) {
    console.error("GET /api/exam-sessions/[sessionId]/progress error:", error);

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
