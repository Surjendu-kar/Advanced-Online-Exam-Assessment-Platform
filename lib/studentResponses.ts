import { supabase } from "@/lib/supabaseClient";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { StudentResponse } from "@/types/database";

/**
 * Get student response for a specific exam session (single row)
 */
export async function getStudentResponseForSession(
  sessionId: string,
  clientType: "browser" | "route" = "browser",
  request?: Request
): Promise<StudentResponse | null> {
  const supabaseClient =
    clientType === "browser" ? supabase : createRouteClient(request!);

  const { data, error } = await supabaseClient
    .from("student_responses")
    .select("*")
    .eq("exam_session_id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No response found
    }
    console.error("Error fetching student response:", error);
    throw new Error(`Failed to fetch student response: ${error.message}`);
  }

  return data;
}

/**
 * Get all student responses for a specific exam (for teachers)
 */
export async function getStudentResponsesForExam(
  examId: string,
  clientType: "browser" | "route" = "browser",
  request?: Request
): Promise<StudentResponse[]> {
  const supabaseClient =
    clientType === "browser" ? supabase : createRouteClient(request!);

  const { data, error } = await supabaseClient
    .from("student_responses")
    .select("*")
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching exam responses:", error);
    throw new Error(`Failed to fetch exam responses: ${error.message}`);
  }

  return data || [];
}

/**
 * Get student responses by grading status
 */
export async function getStudentResponsesByStatus(
  examId: string,
  status: "pending" | "partial" | "completed",
  clientType: "browser" | "route" = "browser",
  request?: Request
): Promise<StudentResponse[]> {
  const supabaseClient =
    clientType === "browser" ? supabase : createRouteClient(request!);

  const { data, error } = await supabaseClient
    .from("student_responses")
    .select("*")
    .eq("exam_id", examId)
    .eq("grading_status", status)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(`Error fetching ${status} responses:`, error);
    throw new Error(`Failed to fetch ${status} responses: ${error.message}`);
  }

  return data || [];
}

/**
 * Update grading for specific questions in a student response
 */
export async function updateQuestionGrades(
  responseId: string,
  questionGrades: {
    [questionId: string]: {
      marks_obtained: number;
      graded?: boolean; // Optional, will be auto-determined
      teacher_feedback?: string;
    };
  },
  clientType: "browser" | "route" = "browser",
  request?: Request
): Promise<StudentResponse> {
  const supabaseClient =
    clientType === "browser" ? supabase : createRouteClient(request!);

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // First, get the current response
  const currentResponse = await supabaseClient
    .from("student_responses")
    .select("*")
    .eq("id", responseId)
    .single();

  if (currentResponse.error) {
    throw new Error(
      `Failed to fetch response: ${currentResponse.error.message}`
    );
  }

  // Update the answers with new grades
  const updatedAnswers = { ...currentResponse.data.answers };
  let manualGradedScore = 0;

  for (const [questionId, gradeInfo] of Object.entries(questionGrades)) {
    if (updatedAnswers[questionId]) {
      // Auto-determine graded status based on marks assignment
      // For manual grading, question is graded when teacher explicitly assigns marks (including 0)
      const isGraded =
        gradeInfo.marks_obtained !== undefined && gradeInfo.marks_obtained >= 0;

      const questionType = updatedAnswers[questionId].type;

      updatedAnswers[questionId] = {
        ...updatedAnswers[questionId],
        marks_obtained: gradeInfo.marks_obtained,
        graded: isGraded, // Automatically determined
        // Only include teacher_feedback for non-MCQ questions
        ...(questionType !== "mcq" && {
          teacher_feedback: gradeInfo.teacher_feedback,
        }),
      };

      // Add to manual graded score if this is not an MCQ
      if (questionType !== "mcq") {
        manualGradedScore += gradeInfo.marks_obtained;
      }
    }
  }

  // Calculate new grading status
  const allGraded = Object.values(updatedAnswers).every(
    (answer: any) => answer.graded
  );
  const newGradingStatus = allGraded ? "completed" : "partial";

  const updateData = {
    answers: updatedAnswers,
    total_score: currentResponse.data.auto_graded_score + manualGradedScore,
    manual_graded_score: manualGradedScore,
    grading_status: newGradingStatus,
    graded_by: user.id,
    graded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from("student_responses")
    .update(updateData)
    .eq("id", responseId)
    .select()
    .single();

  if (error) {
    console.error("Error updating response grades:", error);
    throw new Error(`Failed to update grades: ${error.message}`);
  }

  return data;
}

/**
 * Get exam response statistics
 */
export async function getExamResponseStats(
  examId: string,
  clientType: "browser" | "route" = "browser",
  request?: Request
) {
  const supabaseClient =
    clientType === "browser" ? supabase : createRouteClient(request!);

  const { data, error } = await supabaseClient
    .from("student_responses")
    .select("*")
    .eq("exam_id", examId);

  if (error) {
    console.error("Error fetching response stats:", error);
    throw new Error(`Failed to fetch response stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      total_responses: 0,
      pending_grading: 0,
      completed_grading: 0,
      average_score: 0,
      total_questions: 0,
    };
  }

  // Calculate statistics
  const stats = {
    total_responses: data.length,
    pending_grading: data.filter((r) => r.grading_status === "pending").length,
    partial_grading: data.filter((r) => r.grading_status === "partial").length,
    completed_grading: data.filter((r) => r.grading_status === "completed")
      .length,
    average_score:
      data.reduce((sum, r) => sum + r.total_score, 0) / data.length,
    total_questions: data[0]?.answers ? Object.keys(data[0].answers).length : 0,
    highest_score: Math.max(...data.map((r) => r.total_score)),
    lowest_score: Math.min(...data.map((r) => r.total_score)),
  };

  return stats;
}

/**
 * Get questions that need manual grading for an exam
 */
export async function getQuestionsNeedingGrading(
  examId: string,
  clientType: "browser" | "route" = "browser",
  request?: Request
) {
  const responses = await getStudentResponsesForExam(
    examId,
    clientType,
    request
  );

  const questionsNeedingGrading: {
    questionId: string;
    questionNumber: number;
    type: string;
    studentCount: number;
    gradedCount: number;
  }[] = [];

  // Analyze all responses to find questions needing grading
  const questionMap = new Map();

  responses.forEach((response) => {
    Object.entries(response.answers).forEach(
      ([questionId, answerData]: [string, any]) => {
        if (answerData.type !== "mcq") {
          // Only non-MCQ questions need manual grading
          if (!questionMap.has(questionId)) {
            questionMap.set(questionId, {
              questionId,
              questionNumber: answerData.question_number,
              type: answerData.type,
              studentCount: 0,
              gradedCount: 0,
            });
          }

          const question = questionMap.get(questionId);
          question.studentCount++;
          if (answerData.graded) {
            question.gradedCount++;
          }
        }
      }
    );
  });

  return Array.from(questionMap.values()).sort(
    (a, b) => a.questionNumber - b.questionNumber
  );
}
