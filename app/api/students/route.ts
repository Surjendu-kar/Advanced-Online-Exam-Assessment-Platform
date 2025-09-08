// app/api/students/route.ts
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { createServerClient } from "@/lib/supabaseServerClient";
import {
  createStudentInvitation,
  getStudentInvitations,
  getTeacherStudents,
} from "@/lib/studentInvitations";

export async function POST(req: Request) {
  const routeClient = createRouteClient(req);
  const serverClient = createServerClient();

  try {
    const { email, firstName, lastName, examId, duration, expiresAt } =
      await req.json();

    // Validate input
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get current logged-in user
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return NextResponse.json(
        { error: "Forbidden - Admin or Teacher access required" },
        { status: 403 }
      );
    }

    // If examId is provided, verify the exam belongs to the teacher (if user is teacher)
    if (examId && profile.role === "teacher") {
      const { data: exam } = await routeClient
        .from("exams")
        .select("id, created_by")
        .eq("id", examId)
        .eq("created_by", user.id)
        .single();

      if (!exam) {
        return NextResponse.json(
          { error: "Exam not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Create student invitation using server client (admin privileges needed for user creation)
    const result = await createStudentInvitation(serverClient, {
      email,
      firstName,
      lastName,
      examId,
      duration,
      createdBy: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const responseMessage = examId
      ? `Student invited successfully to exam`
      : `Student invited successfully to platform`;

    return NextResponse.json({
      message: `${responseMessage}. Invitation sent to ${email}`,
      invitation: {
        id: result.invitation?.id,
        email: result.invitation?.student_email,
        exam_id: result.invitation?.exam_id,
        expires_at: result.invitation?.expires_at,
        created_at: result.invitation?.created_at,
      },
    });
  } catch (error) {
    console.error("Error in students API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET method to fetch student invitations and students for admin/teacher
export async function GET(req: Request) {
  const routeClient = createRouteClient(req);

  try {
    // Get current logged-in user
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return NextResponse.json(
        { error: "Forbidden - Admin or Teacher access required" },
        { status: 403 }
      );
    }

    // Get exam_id from query params if provided
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");
    const includeGrading = url.searchParams.get("include_grading") === "true";

    // Get student invitations
    const invitations = await getStudentInvitations(
      routeClient,
      user.id,
      examId || undefined
    );

    // If grading info is requested, enhance invitations with grading data
    let enhancedInvitations = invitations;
    if (includeGrading && invitations) {
      const invitationsWithGrading = await Promise.all(
        invitations.map(async (invitation) => {
          if (!invitation.exam_id) return invitation;

          // Get student response for this exam
          const { data: response } = await routeClient
            .from("student_responses")
            .select("total_score, grading_status, submitted_at")
            .eq("exam_id", invitation.exam_id)
            .eq("student_email", invitation.student_email)
            .single();

          return {
            ...invitation,
            grading_status: response?.grading_status || null,
            total_score: response?.total_score || null,
            submission_date: response?.submitted_at || null,
          };
        })
      );
      enhancedInvitations = invitationsWithGrading;
    }

    // Get existing students created by this teacher/admin
    const students = await getTeacherStudents(routeClient, user.id);

    return NextResponse.json({
      invitations: enhancedInvitations || [],
      students: students || [],
    });
  } catch (error) {
    console.error("Error fetching students data:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE method to cancel/delete student invitations
export async function DELETE(req: Request) {
  const routeClient = createRouteClient(req);

  try {
    const { invitationId } = await req.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get current logged-in user
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return NextResponse.json(
        { error: "Forbidden - Admin or Teacher access required" },
        { status: 403 }
      );
    }

    // Delete the invitation (only if it belongs to the current user)
    const { error: deleteError } = await routeClient
      .from("student_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("teacher_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Student invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error deleting student invitation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
