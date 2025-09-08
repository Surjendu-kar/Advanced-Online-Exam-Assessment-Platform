import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { updateQuestionGrades } from "@/lib/studentResponses";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);
  const { id: examId } = await params;
  const { searchParams } = new URL(req.url);
  const studentEmail = searchParams.get("student_email");

  try {
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a teacher
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

    if (!studentEmail) {
      return NextResponse.json(
        { error: "Student email is required" },
        { status: 400 }
      );
    }

    // Get student response directly using student_email
    const { data: response, error } = await routeClient
      .from("student_responses")
      .select("*")
      .eq("exam_id", examId)
      .eq("student_email", studentEmail)
      .single();

    if (error || !response) {
      console.error("Error fetching student response:", error);
      return NextResponse.json(
        { error: "No submission found for this student" },
        { status: 404 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in grading GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);
  const { id: examId } = await params;

  try {
    const { responseId, grades } = await req.json();

    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a teacher
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

    // Validate grades data
    if (!responseId || !grades) {
      return NextResponse.json(
        { error: "Response ID and grades are required" },
        { status: 400 }
      );
    }

    // Get the exam questions to validate maximum marks
    const [mcqRes, saqRes, codingRes] = await Promise.all([
      routeClient.from("mcq").select("id, marks").eq("exam_id", examId),
      routeClient.from("saq").select("id, marks").eq("exam_id", examId),
      routeClient.from("coding").select("id, marks").eq("exam_id", examId),
    ]);

    const questionMarks: { [key: string]: number } = {};
    [
      ...(mcqRes.data || []),
      ...(saqRes.data || []),
      ...(codingRes.data || []),
    ].forEach((q) => {
      questionMarks[q.id] = q.marks;
    });

    // Validate that assigned marks don't exceed maximum marks for each question
    for (const [questionId, gradeInfo] of Object.entries(grades)) {
      const maxMarks = questionMarks[questionId];
      if (
        maxMarks !== undefined &&
        (gradeInfo as any).marks_obtained > maxMarks
      ) {
        return NextResponse.json(
          { error: `Marks for question cannot exceed ${maxMarks}` },
          { status: 400 }
        );
      }
    }

    // Update the grades using the utility function
    const updatedResponse = await updateQuestionGrades(
      responseId,
      grades,
      "route",
      req
    );

    return NextResponse.json({
      message: "Grades updated successfully",
      response: updatedResponse,
    });
  } catch (error) {
    console.error("Error in grading PUT:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
