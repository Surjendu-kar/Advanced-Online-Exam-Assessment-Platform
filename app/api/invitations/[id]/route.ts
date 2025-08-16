import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/invitations/[id]/resend - Resend invitation
 */
export async function POST(
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

    const invitation = await InvitationService.resendInvitation(
      user.id,
      params.id
    );

    return NextResponse.json({
      data: invitation,
      message: "Invitation resent successfully",
    });
  } catch (error) {
    console.error("POST /api/invitations/[id]/resend error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
          : error.code === "INVITATION_NOT_FOUND"
          ? 404
          : error.code === "INVITATION_ALREADY_ACCEPTED"
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

/**
 * DELETE /api/invitations/[id] - Cancel invitation
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

    await InvitationService.cancelInvitation(user.id, params.id);

    return NextResponse.json({
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("DELETE /api/invitations/[id] error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
          : error.code === "INVITATION_NOT_FOUND"
          ? 404
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
