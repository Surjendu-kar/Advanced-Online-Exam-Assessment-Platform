import { NextRequest, NextResponse } from "next/server";
import { SAQService, ImportSAQData } from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/saq/import - Import SAQ questions from data array
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

    const saqData: ImportSAQData[] = questions.map((q: any) => ({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      answer_guidelines: q.answer_guidelines,
      marking_criteria: q.marking_criteria,
      marks: q.marks,
    }));

    const importedSAQs = await SAQService.importSAQs(user.id, exam_id, saqData);

    return NextResponse.json({
      data: importedSAQs,
      message: `Successfully imported ${importedSAQs.length} SAQ questions`,
    });
  } catch (error) {
    console.error("POST /api/saq/import error:", error);

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
