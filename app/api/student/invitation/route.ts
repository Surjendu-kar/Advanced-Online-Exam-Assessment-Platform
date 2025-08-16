import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "../../../../lib/services/studentService";
import { SupabaseError } from "../../../../lib/supabaseClient";

/**
 * Handle invitation link processing
 * GET /api/student/invitation?token=<invitation_token>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const result = await StudentService.handleInvitationLink(token);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Invitation processing error:", error);

    if (error instanceof SupabaseError) {
      const statusCode =
        error.code === "INVALID_INVITATION" ||
        error.code === "INVITATION_EXPIRED"
          ? 400
          : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 }
    );
  }
}
