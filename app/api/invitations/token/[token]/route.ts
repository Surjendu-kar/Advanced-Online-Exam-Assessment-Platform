import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "../../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../../lib/supabaseClient";

/**
 * GET /api/invitations/token/[token] - Get invitation by token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await InvitationService.getInvitationByToken(
      params.token
    );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Don't return the token in the response for security
    const { invitation_token, ...invitationData } = invitation;

    return NextResponse.json({
      data: invitationData,
    });
  } catch (error) {
    console.error("GET /api/invitations/token/[token] error:", error);

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
