import { NextRequest, NextResponse } from "next/server";
import {
  SAQService,
  UpdateSAQRequest,
} from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/saq/[id] - Get SAQ question by ID
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

    const saq = await SAQService.getSAQById(user.id, params.id);

    if (!saq) {
      return NextResponse.json(
        { error: "SAQ question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: saq });
  } catch (error) {
    console.error(`GET /api/saq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "SAQ_ACCESS_DENIED" ? 403 : 400;
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
 * PUT /api/saq/[id] - Update SAQ question
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
    const updateData: UpdateSAQRequest = {
      id: params.id,
      exam_id: body.exam_id,
      question_text: body.question_text,
      correct_answer: body.correct_answer,
      answer_guidelines: body.answer_guidelines,
      marking_criteria: body.marking_criteria,
      marks: body.marks,
    };

    const saq = await SAQService.updateSAQ(user.id, updateData);

    return NextResponse.json({
      data: saq,
      message: "SAQ question updated successfully",
    });
  } catch (error) {
    console.error(`PUT /api/saq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SAQ_NOT_FOUND"
          ? 404
          : error.code === "SAQ_ACCESS_DENIED"
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
 * DELETE /api/saq/[id] - Delete SAQ question
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

    await SAQService.deleteSAQ(user.id, params.id);

    return NextResponse.json({
      message: "SAQ question deleted successfully",
    });
  } catch (error) {
    console.error(`DELETE /api/saq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "SAQ_NOT_FOUND"
          ? 404
          : error.code === "SAQ_ACCESS_DENIED"
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
