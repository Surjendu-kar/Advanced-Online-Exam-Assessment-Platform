import { NextRequest, NextResponse } from "next/server";
import {
  SAQService,
  CreateSAQRequest,
  GetSAQsOptions,
} from "../../../lib/services/saqService";
import { SupabaseError } from "../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/saq - Get paginated list of SAQ questions
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
    const options: GetSAQsOptions = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      search: searchParams.get("search") || undefined,
      exam_id: searchParams.get("exam_id") || undefined,
    };

    const result = await SAQService.getSAQs(user.id, options);

    return NextResponse.json({
      data: result.data,
      count: result.count,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error("GET /api/saq error:", error);

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

/**
 * POST /api/saq - Create a new SAQ question
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
    const saqData: CreateSAQRequest = {
      exam_id: body.exam_id,
      question_text: body.question_text,
      correct_answer: body.correct_answer,
      answer_guidelines: body.answer_guidelines,
      marking_criteria: body.marking_criteria,
      marks: body.marks,
    };

    const saq = await SAQService.createSAQ(user.id, saqData);

    return NextResponse.json(
      {
        data: saq,
        message: "SAQ question created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/saq error:", error);

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
