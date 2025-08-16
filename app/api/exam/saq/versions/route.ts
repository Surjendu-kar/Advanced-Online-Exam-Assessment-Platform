import { NextRequest, NextResponse } from "next/server";
import { SAQExamService } from "../../../../lib/services/saqExamService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/exam/saq/versions - Get SAQ answer versions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");
    const question_id = searchParams.get("question_id");

    if (!session_id || !question_id) {
      return NextResponse.json(
        { error: "Session ID and Question ID are required" },
        { status: 400 }
      );
    }

    const versions = await SAQExamService.getAnswerVersions(
      user.id,
      session_id,
      question_id
    );

    return NextResponse.json({
      data: versions,
    });
  } catch (error) {
    console.error("GET /api/exam/saq/versions error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SESSION_NOT_FOUND" ? 404 : 400;
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