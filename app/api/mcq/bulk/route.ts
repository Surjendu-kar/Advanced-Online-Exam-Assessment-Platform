import { NextRequest, NextResponse } from "next/server";
import {
  MCQService,
  BulkMCQOperation,
} from "../../../../lib/services/mcqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/mcq/bulk - Perform bulk operations on MCQ questions
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
    const operation: BulkMCQOperation = {
      action: body.action,
      question_ids: body.question_ids,
      data: body.data,
    };

    await MCQService.bulkMCQOperation(user.id, operation);

    return NextResponse.json({
      message: `Bulk ${operation.action} operation completed successfully`,
    });
  } catch (error) {
    console.error("POST /api/mcq/bulk error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "MCQ_ACCESS_DENIED"
          ? 403
          : error.code === "PUBLISHED_EXAM_ERROR"
          ? 409
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
