import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const routeClient = createRouteClient(req);

  try {
    const examId = params.id;
    const { type, questionData } = await req.json();

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

    const { data: exam } = await routeClient
      .from("exams")
      .select("created_by")
      .eq("id", examId)
      .single();

    if (!exam || exam.created_by !== user.id) {
      return NextResponse.json(
        { error: "Exam not found or access denied" },
        { status: 404 }
      );
    }

    let result;
    const baseData = {
      exam_id: examId,
      question_order: questionData.question_order || 1,
      marks: questionData.marks || 1,
    };

    switch (type) {
      case "mcq":
        result = await routeClient
          .from("mcq")
          .insert({
            ...baseData,
            question_text: questionData.question_text,
            options: questionData.options,
            correct_option: questionData.correct_option,
          })
          .select()
          .single();
        break;

      case "saq":
        result = await routeClient
          .from("saq")
          .insert({
            ...baseData,
            question_text: questionData.question_text,
            grading_guidelines: questionData.grading_guidelines,
            rubric: questionData.rubric || null,
          })
          .select()
          .single();
        break;

      case "coding":
        result = await routeClient
          .from("coding")
          .insert({
            ...baseData,
            question_text: questionData.question_text,
            starter_code: questionData.starter_code || "",
            expected_output: questionData.expected_output,
            language: questionData.language || "javascript",
            test_cases: questionData.test_cases || null,
          })
          .select()
          .single();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid question type" },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to create question" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Question created successfully",
      question: result.data,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const routeClient = createRouteClient(req);

  try {
    const examId = params.id;

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

    if (profile.role === "teacher") {
      const { data: exam } = await routeClient
        .from("exams")
        .select("created_by")
        .eq("id", examId)
        .single();

      if (!exam || exam.created_by !== user.id) {
        return NextResponse.json(
          { error: "Exam not found or access denied" },
          { status: 404 }
        );
      }
    }

    const [mcqQuestions, saqQuestions, codingQuestions] = await Promise.all([
      routeClient
        .from("mcq")
        .select("*")
        .eq("exam_id", examId)
        .order("question_order", { ascending: true }),
      routeClient
        .from("saq")
        .select("*")
        .eq("exam_id", examId)
        .order("question_order", { ascending: true }),
      routeClient
        .from("coding")
        .select("*")
        .eq("exam_id", examId)
        .order("question_order", { ascending: true }),
    ]);

    return NextResponse.json({
      questions: {
        mcq: mcqQuestions.data || [],
        saq: saqQuestions.data || [],
        coding: codingQuestions.data || [],
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
