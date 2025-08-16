import { NextRequest, NextResponse } from "next/server";
import {
  CodingService,
  ImportCodingData,
} from "../../../../lib/services/codingService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/coding/import - Import coding questions from data array
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
    const { exam_id, coding_data } = body;

    if (!exam_id || !coding_data || !Array.isArray(coding_data)) {
      return NextResponse.json(
        { error: "exam_id and coding_data array are required" },
        { status: 400 }
      );
    }

    const importedCodings = await CodingService.importCodings(
      user.id,
      exam_id,
      coding_data as ImportCodingData[]
    );

    return NextResponse.json({
      data: importedCodings,
      message: `${importedCodings.length} coding questions imported successfully`,
    });
  } catch (error) {
    console.error("POST /api/coding/import error:", error);

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
