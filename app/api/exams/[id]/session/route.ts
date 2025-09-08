import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);
  const { id: examId } = await params;

  try {
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a student
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden - Student access required" },
        { status: 403 }
      );
    }

    // Get existing session for this exam and user
    const { data: session, error: sessionError } = await routeClient
      .from("exam_sessions")
      .select("*")
      .eq("exam_id", examId)
      .eq("user_id", user.id)
      .single();

    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("Error fetching session:", sessionError);
      return NextResponse.json(
        { error: "Failed to fetch session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: session || null,
    });
  } catch (error) {
    console.error("Error in session GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);
  const { id: examId } = await params;

  try {
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a student
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden - Student access required" },
        { status: 403 }
      );
    }

    // Verify exam exists and is accessible
    const { data: exam, error: examError } = await routeClient
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if session already exists
    const { data: existingSession } = await routeClient
      .from("exam_sessions")
      .select("*")
      .eq("exam_id", examId)
      .eq("user_id", user.id)
      .single();

    if (existingSession) {
      return NextResponse.json(
        { error: "Exam session already exists" },
        { status: 400 }
      );
    }

    // Create new exam session
    const { data: session, error: createError } = await routeClient
      .from("exam_sessions")
      .insert({
        exam_id: examId,
        user_id: user.id,
        start_time: new Date().toISOString(),
        status: "in_progress",
        total_score: 0,
        violations_count: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating session:", createError);
      return NextResponse.json(
        { error: "Failed to start exam session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exam session started successfully",
      session,
    });
  } catch (error) {
    console.error("Error in session POST:", error);
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
    const { answers, status } = await req.json();

    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a student
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden - Student access required" },
        { status: 403 }
      );
    }

    // Get existing session
    const { data: session, error: sessionError } = await routeClient
      .from("exam_sessions")
      .select("*")
      .eq("exam_id", examId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Exam session not found" },
        { status: 404 }
      );
    }

    // Update session status
    const updateData: any = {};

    if (status === "completed") {
      updateData.status = "completed";
      updateData.end_time = new Date().toISOString();

      // Calculate score (basic implementation)
      let totalScore = 0;

      if (answers) {
        // Get questions to calculate score
        const { data: questionsData } = await routeClient
          .from("mcq")
          .select("*")
          .eq("exam_id", examId);

        if (questionsData) {
          for (const question of questionsData) {
            const studentAnswer = answers[question.id];
            if (studentAnswer === question.correct_option) {
              totalScore += question.marks;
            }
          }
        }
      }

      updateData.total_score = totalScore;
    }

    // Update session
    const { data: updatedSession, error: updateError } = await routeClient
      .from("exam_sessions")
      .update(updateData)
      .eq("id", session.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating session:", updateError);
      return NextResponse.json(
        { error: "Failed to update exam session" },
        { status: 500 }
      );
    }

    // Save answers to optimized student_responses table (single row)
    if (answers && status === "completed") {
      console.log("Debug - Saving student answers:", {
        examId,
        userId: user.id,
        answersCount: Object.keys(answers).length,
        answers: answers,
      });

      try {
        // Get student profile for full name
        const { data: profile } = await routeClient
          .from("user_profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        // Get all template questions to determine question types and calculate scores
        const [mcqQuestions, saqQuestions, codingQuestions] = await Promise.all(
          [
            routeClient
              .from("mcq")
              .select("*")
              .eq("exam_id", examId)
              .is("user_id", null)
              .order("question_order", { ascending: true }),
            routeClient
              .from("saq")
              .select("*")
              .eq("exam_id", examId)
              .is("user_id", null)
              .order("question_order", { ascending: true }),
            routeClient
              .from("coding")
              .select("*")
              .eq("exam_id", examId)
              .is("user_id", null)
              .order("question_order", { ascending: true }),
          ]
        );

        const optimizedAnswers: any = {};
        let autoGradedScore = 0;
        let maxPossibleScore = 0;
        let questionNumber = 1;

        // Process MCQ answers
        if (mcqQuestions.data) {
          for (const question of mcqQuestions.data) {
            const studentAnswer = answers[question.id];
            if (studentAnswer !== undefined) {
              const isCorrect = studentAnswer === question.correct_option;
              const marksObtained = isCorrect ? question.marks : 0;

              optimizedAnswers[question.id] = {
                answer: studentAnswer,
                type: "mcq",
                question_number: questionNumber++,
                is_correct: isCorrect,
                marks_obtained: marksObtained,
                graded: true, // MCQ is auto-graded
              };

              autoGradedScore += marksObtained;
              maxPossibleScore += question.marks;

              console.log(
                `Debug - Processing MCQ: Q${
                  questionNumber - 1
                }, Answer: ${studentAnswer}, Correct: ${isCorrect}`
              );
            }
          }
        }

        // Process SAQ answers
        if (saqQuestions.data) {
          for (const question of saqQuestions.data) {
            const studentAnswer = answers[question.id];
            if (studentAnswer !== undefined) {
              optimizedAnswers[question.id] = {
                answer: studentAnswer,
                type: "saq",
                question_number: questionNumber++,
                marks_obtained: 0, // To be graded manually
                graded: false,
              };

              maxPossibleScore += question.marks;

              console.log(
                `Debug - Processing SAQ: Q${
                  questionNumber - 1
                }, Answer length: ${studentAnswer.length}`
              );
            }
          }
        }

        // Process Coding answers
        if (codingQuestions.data) {
          for (const question of codingQuestions.data) {
            const studentAnswer = answers[question.id];
            if (studentAnswer !== undefined) {
              optimizedAnswers[question.id] = {
                answer: studentAnswer,
                type: "coding",
                question_number: questionNumber++,
                language: question.language || "javascript",
                marks_obtained: 0, // To be graded manually
                graded: false,
              };

              maxPossibleScore += question.marks;

              console.log(
                `Debug - Processing Coding: Q${
                  questionNumber - 1
                }, Code length: ${studentAnswer.length}`
              );
            }
          }
        }

        // Check if response already exists (update) or create new
        const { data: existingResponse } = await routeClient
          .from("student_responses")
          .select("id")
          .eq("exam_session_id", session.id)
          .single();

        const responseData = {
          student_id: user.id,
          exam_session_id: session.id,
          exam_id: examId,
          student_first_name: profile?.first_name || "Unknown",
          student_last_name: profile?.last_name || "Student",
          student_email: user.email || "",
          answers: optimizedAnswers,
          total_score: autoGradedScore, // Only auto-graded for now
          max_possible_score: maxPossibleScore,
          auto_graded_score: autoGradedScore,
          manual_graded_score: 0,
          grading_status: Object.values(optimizedAnswers).some(
            (a: any) => !a.graded
          )
            ? "partial"
            : "completed",
          submitted_at: new Date().toISOString(),
        };

        if (existingResponse) {
          // Update existing response
          const { error: updateError } = await routeClient
            .from("student_responses")
            .update({
              ...responseData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingResponse.id);

          if (updateError) {
            console.error("Error updating student response:", updateError);
          } else {
            console.log("Successfully updated student response");
          }
        } else {
          // Insert new response
          const { error: insertError } = await routeClient
            .from("student_responses")
            .insert(responseData);

          if (insertError) {
            console.error("Error inserting student response:", insertError);
          } else {
            console.log("Successfully saved student response");
          }
        }
      } catch (answerError) {
        console.error("Error saving answers:", answerError);
        // Continue execution - session is already updated
      }
    }

    return NextResponse.json({
      message: "Exam session updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error in session PUT:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
