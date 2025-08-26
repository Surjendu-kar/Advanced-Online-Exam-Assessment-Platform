// app/api/student-invitation/[token]/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import {
  validateStudentInvitationToken,
  acceptStudentInvitation,
} from "@/lib/studentInvitations";

// GET method to validate invitation token
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const serverClient = createServerClient();

  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate invitation token
    const result = await validateStudentInvitationToken(serverClient, token);

    if (!result.valid) {
      if (result.redirectToStudent) {
        return NextResponse.json(
          {
            error: result.error,
            redirectToStudent: true,
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      invitation: result.invitation,
    });
  } catch (error) {
    console.error("Error validating student invitation token:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST method to accept invitation and create session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const serverClient = createServerClient();

  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Accept the invitation
    const result = await acceptStudentInvitation(serverClient, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: "Invitation accepted successfully",
      examId: result.examId,
      studentEmail: result.studentEmail,
      password: result.password, // Return temp password for auto-login
      redirectUrl: result.examId
        ? `/student/exam/${result.examId}`
        : "/student",
    });
  } catch (error) {
    console.error("Error accepting student invitation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
