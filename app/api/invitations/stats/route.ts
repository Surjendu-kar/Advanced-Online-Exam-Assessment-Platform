import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/invitations/stats - Get invitation statistics
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

    const stats = await InvitationService.getInvitationStats(user.id);

    return NextResponse.json({
      data: stats,
    });
  } catch (error) {
    console.error("GET /api/invitations/stats error:", error);

    if (error instanceof SupabaseError) {
      const statusCode = error.code === "PERMISSION_DENIED" ? 403 : 400;
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
