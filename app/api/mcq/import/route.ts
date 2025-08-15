import { NextRequest, NextResponse } from "next/server";
import { MCQService, ImportMCQData } from "../../../../lib/services/mcqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/mcq/import - Import MCQ questions from data array
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
    const { exam_id, questions } = body;

    if (!exam_id) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions array is required" },
        { status: 400 }
      );
    }

    const mcqData: ImportMCQData[] = questions;
    const importedMCQs = await MCQService.importMCQs(user.id, exam_id, mcqData);

    return NextResponse.json(
      {
        data: importedMCQs,
        message: `Successfully imported ${importedMCQs.length} MCQ questions`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/mcq/import error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "EXAM_ACCESS_DENIED" ? 403 : 400;
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
