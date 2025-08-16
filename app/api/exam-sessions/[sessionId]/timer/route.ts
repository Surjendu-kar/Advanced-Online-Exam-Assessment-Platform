import { NextRequest, NextResponse } from "next/server";
import { ExamTimerService } from "../../../../../lib/services/examTimerService";
import { SupabaseError } from "../../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/exam-sessions/[sessionId]/timer - Get timer information
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

    const timerInfo = await ExamTimerService.getTimerInfo(
      user.id,
      params.sessionId
    );

    // Get time warnings
    const warnings = ExamTimerService.getTimeWarnings(
      timerInfo.time_remaining_seconds
    );

    // Format time remaining
    const formattedTime = ExamTimerService.formatTimeRemaining(
      timerInfo.time_remaining_seconds
    );

    return NextResponse.json({
      data: {
        ...timerInfo,
        formatted_time_remaining: formattedTime,
        warnings,
      },
    });
  } catch (error) {
    console.error("GET /api/exam-sessions/[sessionId]/timer error:", error);

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
