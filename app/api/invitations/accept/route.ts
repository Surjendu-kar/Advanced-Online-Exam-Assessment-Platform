import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * POST /api/invitations/accept - Accept invitation by token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const invitation = await InvitationService.acceptInvitation(token);

    return NextResponse.json({
      data: invitation,
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.error("POST /api/invitations/accept error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "INVITATION_NOT_FOUND"
          ? 404
          : error.code === "INVITATION_EXPIRED"
          ? 410
          : error.code === "INVITATION_INVALID_STATUS"
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
