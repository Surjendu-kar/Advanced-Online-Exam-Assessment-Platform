import { NextRequest, NextResponse } from "next/server";
import {
  SAQService,
  BulkSAQOperation,
} from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/saq/bulk - Perform bulk operations on SAQ questions
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
    const operation: BulkSAQOperation = {
      action: body.action,
      question_ids: body.question_ids,
      data: body.data,
    };

    await SAQService.bulkSAQOperation(user.id, operation);

    return NextResponse.json({
      message: `Bulk ${operation.action} operation completed successfully`,
    });
  } catch (error) {
    console.error("POST /api/saq/bulk error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SAQ_ACCESS_DENIED"
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
