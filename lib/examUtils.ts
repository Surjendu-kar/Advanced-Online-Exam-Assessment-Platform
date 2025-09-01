import { SupabaseClient } from "@supabase/supabase-js";

export interface ExamData {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  accessType?: "invitation" | "code" | "public";
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResultsImmediately?: boolean;
  requireWebcam?: boolean;
  maxViolations?: number;
  duration?: number;
}

export interface ExamValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateExamData(data: ExamData): ExamValidationResult {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push("Title is required");
  }

  if (data.title && data.title.length > 255) {
    errors.push("Title must be less than 255 characters");
  }

  if (data.description && data.description.length > 1000) {
    errors.push("Description must be less than 1000 characters");
  }

  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      errors.push("End time must be after start time");
    }

    if (start < new Date()) {
      errors.push("Start time cannot be in the past");
    }
  }

  if (data.maxAttempts && (data.maxAttempts < 1 || data.maxAttempts > 10)) {
    errors.push("Max attempts must be between 1 and 10");
  }

  if (
    data.maxViolations &&
    (data.maxViolations < 1 || data.maxViolations > 20)
  ) {
    errors.push("Max violations must be between 1 and 20");
  }

  if (data.duration && (data.duration < 5 || data.duration > 480)) {
    errors.push("Duration must be between 5 and 480 minutes");
  }

  if (
    data.accessType &&
    !["invitation", "code", "public"].includes(data.accessType)
  ) {
    errors.push("Access type must be 'invitation', 'code', or 'public'");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function generateUniqueExamCode(
  supabase: SupabaseClient
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data } = await supabase
      .from("exams")
      .select("id")
      .eq("unique_code", code)
      .single();

    if (!data) {
      return code;
    }

    attempts++;
  }

  throw new Error("Unable to generate unique exam code");
}

export async function getTeacherExams(
  supabase: SupabaseClient,
  teacherId: string
) {
  const { data: exams, error } = await supabase
    .from("exams")
    .select("*")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch exams: ${error.message}`);
  }

  if (!exams || exams.length === 0) {
    return [];
  }

  // Fetch question counts and marks for each exam
  const examIds = exams.map((exam) => exam.id);

  const [mcqResults, saqResults, codingResults] = await Promise.all([
    supabase.from("mcq").select("exam_id, marks").in("exam_id", examIds),
    supabase.from("saq").select("exam_id, marks").in("exam_id", examIds),
    supabase.from("coding").select("exam_id, marks").in("exam_id", examIds),
  ]);

  if (mcqResults.error || saqResults.error || codingResults.error) {
    // If there's an error fetching questions, return exams without question data
    console.warn("Error fetching question data:", {
      mcqError: mcqResults.error,
      saqError: saqResults.error,
      codingError: codingResults.error,
    });
    return exams.map((exam) => ({
      ...exam,
      question_count: 0,
      total_marks: 0,
      mcq_count: 0,
      saq_count: 0,
      coding_count: 0,
    }));
  }

  // Process the data to calculate totals for each exam
  const processedExams = exams.map((exam) => {
    const mcqQuestions =
      mcqResults.data?.filter((q) => q.exam_id === exam.id) || [];
    const saqQuestions =
      saqResults.data?.filter((q) => q.exam_id === exam.id) || [];
    const codingQuestions =
      codingResults.data?.filter((q) => q.exam_id === exam.id) || [];

    const mcqCount = mcqQuestions.length;
    const saqCount = saqQuestions.length;
    const codingCount = codingQuestions.length;

    const mcqMarks = mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const saqMarks = saqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const codingMarks = codingQuestions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0
    );

    return {
      ...exam,
      question_count: mcqCount + saqCount + codingCount,
      total_marks: mcqMarks + saqMarks + codingMarks,
      mcq_count: mcqCount,
      saq_count: saqCount,
      coding_count: codingCount,
    };
  });

  return processedExams;
}

export async function getExamWithQuestions(
  supabase: SupabaseClient,
  examId: string,
  userId: string
) {
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    throw new Error("Exam not found");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw new Error("User profile not found");
  }

  if (profile.role === "teacher" && exam.created_by !== userId) {
    throw new Error("Access denied");
  }

  const [mcqQuestions, saqQuestions, codingQuestions] = await Promise.all([
    supabase
      .from("mcq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true }),
    supabase
      .from("saq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true }),
    supabase
      .from("coding")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true }),
  ]);

  if (mcqQuestions.error || saqQuestions.error || codingQuestions.error) {
    throw new Error("Failed to fetch exam questions");
  }

  return {
    exam,
    questions: {
      mcq: mcqQuestions.data || [],
      saq: saqQuestions.data || [],
      coding: codingQuestions.data || [],
    },
  };
}

export function isExamActive(exam: any): boolean {
  const now = new Date();
  const startTime = exam.start_time ? new Date(exam.start_time) : null;
  const endTime = exam.end_time ? new Date(exam.end_time) : null;

  if (startTime && now < startTime) {
    return false;
  }

  if (endTime && now > endTime) {
    return false;
  }

  return true;
}

export function getExamStatus(exam: any): "upcoming" | "active" | "ended" {
  const now = new Date();
  const startTime = exam.start_time ? new Date(exam.start_time) : null;
  const endTime = exam.end_time ? new Date(exam.end_time) : null;

  if (startTime && now < startTime) {
    return "upcoming";
  }

  if (endTime && now > endTime) {
    return "ended";
  }

  return "active";
}

export async function duplicateExam(
  supabase: SupabaseClient,
  examId: string,
  userId: string,
  newTitle: string
) {
  const examData = await getExamWithQuestions(supabase, examId, userId);

  const newCode = await generateUniqueExamCode(supabase);

  const { data: newExam, error: examError } = await supabase
    .from("exams")
    .insert({
      ...examData.exam,
      id: undefined,
      title: newTitle,
      unique_code: newCode,
      created_at: undefined,
      start_time: null,
      end_time: null,
    })
    .select()
    .single();

  if (examError) {
    throw new Error(`Failed to duplicate exam: ${examError.message}`);
  }

  const duplicatePromises = [];

  if (examData.questions.mcq.length > 0) {
    duplicatePromises.push(
      supabase.from("mcq").insert(
        examData.questions.mcq.map((q) => ({
          ...q,
          id: undefined,
          exam_id: newExam.id,
          user_id: null,
          selected_option: null,
          is_correct: null,
          marks_obtained: null,
          created_at: undefined,
        }))
      )
    );
  }

  if (examData.questions.saq.length > 0) {
    duplicatePromises.push(
      supabase.from("saq").insert(
        examData.questions.saq.map((q) => ({
          ...q,
          id: undefined,
          exam_id: newExam.id,
          user_id: null,
          answer_text: null,
          marks_obtained: null,
          created_at: undefined,
        }))
      )
    );
  }

  if (examData.questions.coding.length > 0) {
    duplicatePromises.push(
      supabase.from("coding").insert(
        examData.questions.coding.map((q) => ({
          ...q,
          id: undefined,
          exam_id: newExam.id,
          user_id: null,
          submitted_code: null,
          output: null,
          marks_obtained: null,
          created_at: undefined,
        }))
      )
    );
  }

  if (duplicatePromises.length > 0) {
    const results = await Promise.all(duplicatePromises);
    const hasError = results.some((result) => result.error);

    if (hasError) {
      await supabase.from("exams").delete().eq("id", newExam.id);
      throw new Error("Failed to duplicate exam questions");
    }
  }

  return newExam;
}
