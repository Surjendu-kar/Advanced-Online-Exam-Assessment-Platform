import { NextRequest, NextResponse } from "next/server";
import {
  CodingService,
  CreateCodingRequest,
  GetCodingOptions,
} from "../../../lib/services/codingService";
import { SupabaseError } from "../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/coding - Get paginated list of coding questions
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
    const options: GetCodingOptions = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      search: searchParams.get("search") || undefined,
      exam_id: searchParams.get("exam_id") || undefined,
      language: searchParams.get("language") || undefined,
    };

    const result = await CodingService.getCodings(user.id, options);

    return NextResponse.json({
      data: result.data,
      count: result.count,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error("GET /api/coding error:", error);

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
 * POST /api/coding - Create a new coding question
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
    const codingData: CreateCodingRequest = {
      exam_id: body.exam_id,
      question_text: body.question_text,
      starter_code: body.starter_code,
      expected_output: body.expected_output,
      marks: body.marks,
      language: body.language,
      test_cases: body.test_cases,
    };

    const coding = await CodingService.createCoding(user.id, codingData);

    return NextResponse.json(
      {
        data: coding,
        message: "Coding question created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/coding error:", error);

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
