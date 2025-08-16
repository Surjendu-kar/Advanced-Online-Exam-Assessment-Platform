import { NextRequest, NextResponse } from "next/server";
import {
  CodingService,
  UpdateCodingRequest,
} from "../../../../lib/services/codingService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/coding/[id] - Get coding question by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coding = await CodingService.getCodingById(user.id, params.id);

    if (!coding) {
      return NextResponse.json(
        { error: "Coding question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: coding });
  } catch (error) {
    console.error("GET /api/coding/[id] error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "CODING_ACCESS_DENIED" ? 403 : 400;
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
 * PUT /api/coding/[id] - Update coding question
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const updateData: UpdateCodingRequest = {
      id: params.id,
      exam_id: body.exam_id,
      question_text: body.question_text,
      starter_code: body.starter_code,
      expected_output: body.expected_output,
      marks: body.marks,
      language: body.language,
      test_cases: body.test_cases,
    };

    const coding = await CodingService.updateCoding(user.id, updateData);

    return NextResponse.json({
      data: coding,
      message: "Coding question updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/coding/[id] error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "CODING_NOT_FOUND"
          ? 404
          : error.code === "CODING_ACCESS_DENIED"
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

/**
 * DELETE /api/coding/[id] - Delete coding question
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await CodingService.deleteCoding(user.id, params.id);

    return NextResponse.json({
      message: "Coding question deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/coding/[id] error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "CODING_NOT_FOUND"
          ? 404
          : error.code === "CODING_ACCESS_DENIED"
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
