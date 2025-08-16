import { NextRequest, NextResponse } from "next/server";
import {
  InvitationService,
  BulkInvitationRequest,
} from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/invitations/bulk - Create multiple invitations
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
    const bulkData: BulkInvitationRequest = {
      student_emails: body.student_emails,
      exam_id: body.exam_id,
      expires_in_hours: body.expires_in_hours,
    };

    const result = await InvitationService.createBulkInvitations(
      user.id,
      bulkData
    );

    return NextResponse.json({
      data: result,
      message: `${result.successful.length} invitations created successfully, ${result.failed.length} failed`,
    });
  } catch (error) {
    console.error("POST /api/invitations/bulk error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
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
