import { NextRequest, NextResponse } from "next/server";
import {
  CodingService,
  SUPPORTED_LANGUAGES,
} from "../../../../lib/services/codingService";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/coding/templates - Get coding templates and language information
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
    const language = searchParams.get("language");

    // If language is specified, return language-specific template
    if (language) {
      const template = CodingService.getLanguageTemplate(language);
      return NextResponse.json({
        data: {
          language,
          template,
        },
      });
    }

    // Return all predefined templates and supported languages
    const templates = CodingService.getCodingTemplates();

    return NextResponse.json({
      data: {
        templates,
        supported_languages: SUPPORTED_LANGUAGES,
      },
    });
  } catch (error) {
    console.error("GET /api/coding/templates error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
