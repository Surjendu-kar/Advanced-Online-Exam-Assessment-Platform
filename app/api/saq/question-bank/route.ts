import { NextRequest, NextResponse } from "next/server";
import { SAQService } from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/saq/question-bank - Get SAQ questions for question bank (reusable questions)
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
    const options = {
      search: searchParams.get("search") || undefined,
      limit: parseInt(searchParams.get("limit") || "50"),
      category: searchParams.get("category") || undefined,
    };

    const questionBank = await SAQService.getQuestionBank(user.id, options);

    return NextResponse.json({
      data: questionBank,
      count: questionBank.length,
    });
  } catch (error) {
    console.error("GET /api/saq/question-bank error:", error);

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
