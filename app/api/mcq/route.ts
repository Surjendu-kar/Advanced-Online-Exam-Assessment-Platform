import { NextRequest, NextResponse } from "next/server";
import {
  MCQService,
  CreateMCQRequest,
  GetMCQsOptions,
} from "../../../lib/services/mcqService";
import { SupabaseError } from "../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/mcq - Get paginated list of MCQ questions
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
    const options: GetMCQsOptions = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      search: searchParams.get("search") || undefined,
      exam_id: searchParams.get("exam_id") || undefined,
    };

    const result = await MCQService.getMCQs(user.id, options);

    return NextResponse.json({
      data: result.data,
      count: result.count,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error("GET /api/mcq error:", error);

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
 * POST /api/mcq - Create a new MCQ question
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
    const mcqData: CreateMCQRequest = {
      exam_id: body.exam_id,
      question_text: body.question_text,
      options: body.options,
      correct_option: body.correct_option,
      marks: body.marks,
    };

    const mcq = await MCQService.createMCQ(user.id, mcqData);

    return NextResponse.json(
      {
        data: mcq,
        message: "MCQ question created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/mcq error:", error);

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
