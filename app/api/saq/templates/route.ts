import { NextRequest, NextResponse } from "next/server";
import { SAQService } from "../../../../lib/services/saqService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/saq/templates - Get predefined SAQ templates
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

    const templates = SAQService.getTemplates();

    return NextResponse.json({
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("GET /api/saq/templates error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saq/templates - Create SAQ from template
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
    const { exam_id, template_id, customizations } = body;

    if (!exam_id || !template_id) {
      return NextResponse.json(
        { error: "Exam ID and template ID are required" },
        { status: 400 }
      );
    }

    const saq = await SAQService.createFromTemplate(
      user.id,
      exam_id,
      template_id,
      customizations || {}
    );

    return NextResponse.json({
      data: saq,
      message: "SAQ question created from template successfully",
    });
  } catch (error) {
    console.error("POST /api/saq/templates error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "TEMPLATE_NOT_FOUND"
          ? 404
          : error.code === "EXAM_ACCESS_DENIED"
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
