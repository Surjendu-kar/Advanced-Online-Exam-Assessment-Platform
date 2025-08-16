import { NextRequest, NextResponse } from "next/server";
import { CodingService } from "../../../../lib/services/codingService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/coding/copy - Copy coding question to another exam
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
    const { coding_id, target_exam_id } = body;

    if (!coding_id || !target_exam_id) {
      return NextResponse.json(
        { error: "coding_id and target_exam_id are required" },
        { status: 400 }
      );
    }

    const copiedCoding = await CodingService.copyCodingToExam(
      user.id,
      coding_id,
      target_exam_id
    );

    return NextResponse.json({
      data: copiedCoding,
      message: "Coding question copied successfully",
    });
  } catch (error) {
    console.error("POST /api/coding/copy error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "CODING_NOT_FOUND"
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
