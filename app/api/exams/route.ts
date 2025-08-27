import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import {
  validateExamData,
  generateUniqueExamCode,
  getTeacherExams,
} from "@/lib/examUtils";

export async function POST(req: Request) {
  const routeClient = createRouteClient(req);

  try {
    const {
      title,
      description,
      startTime,
      endTime,
      accessType = "invitation",
      maxAttempts = 1,
      shuffleQuestions = false,
      showResultsImmediately = false,
      requireWebcam = true,
      maxViolations = 3,
      duration = 60,
    } = await req.json();

    const validation = validateExamData({
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
      duration,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

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

    const uniqueCode = await generateUniqueExamCode(routeClient);

    const { data: exam, error } = await routeClient
      .from("exams")
      .insert({
        title,
        description,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        unique_code: uniqueCode,
        created_by: user.id,
        access_type: accessType,
        max_attempts: maxAttempts,
        shuffle_questions: shuffleQuestions,
        show_results_immediately: showResultsImmediately,
        require_webcam: requireWebcam,
        max_violations: maxViolations,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating exam:", error);
      return NextResponse.json(
        { error: "Failed to create exam" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    console.error("Error in exam creation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const routeClient = createRouteClient(req);

  try {
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

    const exams = await getTeacherExams(routeClient, user.id);

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Error fetching exams:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
