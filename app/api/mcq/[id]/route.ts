import { NextRequest, NextResponse } from "next/server";
import {
  MCQService,
  UpdateMCQRequest,
} from "../../../../lib/services/mcqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/mcq/[id] - Get MCQ question by ID
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

    const mcq = await MCQService.getMCQById(user.id, params.id);

    if (!mcq) {
      return NextResponse.json(
        { error: "MCQ question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: mcq });
  } catch (error) {
    console.error(`GET /api/mcq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "MCQ_ACCESS_DENIED" ? 403 : 400;
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
 * PUT /api/mcq/[id] - Update MCQ question
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
    const updateData: UpdateMCQRequest = {
      id: params.id,
      exam_id: body.exam_id,
      question_text: body.question_text,
      options: body.options,
      correct_option: body.correct_option,
      marks: body.marks,
    };

    const mcq = await MCQService.updateMCQ(user.id, updateData);

    return NextResponse.json({
      data: mcq,
      message: "MCQ question updated successfully",
    });
  } catch (error) {
    console.error(`PUT /api/mcq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "MCQ_NOT_FOUND"
          ? 404
          : error.code === "MCQ_ACCESS_DENIED"
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
 * DELETE /api/mcq/[id] - Delete MCQ question
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

    await MCQService.deleteMCQ(user.id, params.id);

    return NextResponse.json({
      message: "MCQ question deleted successfully",
    });
  } catch (error) {
    console.error(`DELETE /api/mcq/${params.id} error:`, error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "MCQ_NOT_FOUND"
          ? 404
          : error.code === "MCQ_ACCESS_DENIED"
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
