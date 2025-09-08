import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);

  try {
    const { id: examId } = await params;
    const {
      title,
      description,
      startTime,
      endTime,
      accessType,
      maxAttempts,
      shuffleQuestions,
      showResultsImmediately,
      requireWebcam,
      maxViolations,
    } = await req.json();

    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden - Teacher access required" },
        { status: 403 }
      );
    }

    const { data: existingExam } = await routeClient
      .from("exams")
      .select("created_by")
      .eq("id", examId)
      .single();

    if (!existingExam || existingExam.created_by !== user.id) {
      return NextResponse.json(
        { error: "Exam not found or access denied" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined)
      updateData.start_time = startTime
        ? new Date(startTime).toISOString()
        : null;
    if (endTime !== undefined)
      updateData.end_time = endTime ? new Date(endTime).toISOString() : null;
    if (accessType !== undefined) updateData.access_type = accessType;
    if (maxAttempts !== undefined) updateData.max_attempts = maxAttempts;
    if (shuffleQuestions !== undefined)
      updateData.shuffle_questions = shuffleQuestions;
    if (showResultsImmediately !== undefined)
      updateData.show_results_immediately = showResultsImmediately;
    if (requireWebcam !== undefined) updateData.require_webcam = requireWebcam;
    if (maxViolations !== undefined) updateData.max_violations = maxViolations;

    const { data: exam, error } = await routeClient
      .from("exams")
      .update(updateData)
      .eq("id", examId)
      .eq("created_by", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating exam:", error);
      return NextResponse.json(
        { error: "Failed to update exam" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);

  try {
    const { id: examId } = await params;

    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden - Teacher access required" },
        { status: 403 }
      );
    }

    const { error } = await routeClient
      .from("exams")
      .delete()
      .eq("id", examId)
      .eq("created_by", user.id);

    if (error) {
      console.error("Error deleting exam:", error);
      return NextResponse.json(
        { error: "Failed to delete exam" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);

  try {
    const { id: examId } = await params;

    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "teacher" && profile.role !== "student")
    ) {
      return NextResponse.json(
        { error: "Forbidden - Teacher or Student access required" },
        { status: 403 }
      );
    }

    let query = routeClient.from("exams").select("*").eq("id", examId);

    if (profile.role === "teacher") {
      query = query.eq("created_by", user.id);
    } else if (profile.role === "student") {
      // For students, check if they have access via invitation
      const { data: invitation } = await routeClient
        .from("student_invitations")
        .select("*")
        .eq("exam_id", examId)
        .eq("student_id", user.id)
        .eq("status", "accepted")
        .single();

      if (!invitation) {
        // Also check by email in case student_id wasn't updated
        const { data: emailInvitation } = await routeClient
          .from("student_invitations")
          .select("*")
          .eq("exam_id", examId)
          .eq("student_email", user.email || "")
          .eq("status", "accepted")
          .single();

        if (!emailInvitation) {
          return NextResponse.json(
            {
              error:
                "You don't have access to this exam. Please check your invitation.",
            },
            { status: 403 }
          );
        }
      }
    }

    const { data: exam, error } = await query.single();

    console.log(
      `Debug - Exam access for user ${user.id} (${profile.role}) to exam ${examId}:`,
      {
        examFound: !!exam,
        examError: error?.message,
        userEmail: user.email,
      }
    );

    if (error || !exam) {
      return NextResponse.json(
        { error: "Exam not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ exam });
  } catch (error) {
    console.error("Error fetching exam:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
