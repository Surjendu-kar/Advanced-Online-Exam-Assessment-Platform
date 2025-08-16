import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/invitations/csv - Parse CSV and create bulk invitations
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
    const { csv_data, exam_id, expires_in_hours } = body;

    if (!csv_data) {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 }
      );
    }

    // Parse CSV data
    const emails = InvitationService.parseCsvEmails(csv_data);

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses found in CSV data" },
        { status: 400 }
      );
    }

    // Create bulk invitations
    const result = await InvitationService.createBulkInvitations(user.id, {
      student_emails: emails,
      exam_id,
      expires_in_hours,
    });

    return NextResponse.json({
      data: {
        ...result,
        parsed_emails: emails,
        total_parsed: emails.length,
      },
      message: `Parsed ${emails.length} emails from CSV. ${result.successful.length} invitations created successfully, ${result.failed.length} failed`,
    });
  } catch (error) {
    console.error("POST /api/invitations/csv error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "PERMISSION_DENIED"
          ? 403
          : error.code === "EXAM_ACCESS_DENIED"
          ? 403
          : error.code === "CSV_PARSE_ERROR"
          ? 400
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
