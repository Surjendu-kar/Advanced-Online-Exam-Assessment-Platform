import { NextRequest, NextResponse } from "next/server";
import {
  InvitationService,
  CreateInvitationRequest,
  GetInvitationsOptions,
} from "../../../lib/services/invitationService";
import { SupabaseError } from "../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/invitations - Get paginated list of invitations
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
    const options: GetInvitationsOptions = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as any) || undefined,
      exam_id: searchParams.get("exam_id") || undefined,
    };

    const result = await InvitationService.getInvitations(user.id, options);

    return NextResponse.json({
      data: result.data,
      count: result.count,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error("GET /api/invitations error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
          : error.code === "USER_NOT_FOUND"
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

/**
 * POST /api/invitations - Create a new invitation
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
    const invitationData: CreateInvitationRequest = {
      student_email: body.student_email,
      exam_id: body.exam_id,
      expires_in_hours: body.expires_in_hours,
    };

    const invitation = await InvitationService.createInvitation(
      user.id,
      invitationData
    );

    return NextResponse.json(
      {
        data: invitation,
        message: "Invitation created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/invitations error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
          : error.code === "EXAM_ACCESS_DENIED"
          ? 403
          : error.code === "DUPLICATE_INVITATION"
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
