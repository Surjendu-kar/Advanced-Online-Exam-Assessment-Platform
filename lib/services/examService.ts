import { supabase, SupabaseError } from "../supabaseClient";
import { Exam } from "../../types/database";

export interface CreateExamRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  duration: number; // in minutes
  access_type: "invitation" | "code" | "open";
  exam_code?: string;
  max_attempts?: number;
  shuffle_questions?: boolean;
  show_results_immediately?: boolean;
  require_webcam?: boolean;
  max_violations?: number;
}

export interface UpdateExamRequest extends Partial<CreateExamRequest> {
  is_published?: boolean;
  total_marks?: number;
}

export interface GetExamsOptions {
  page?: number;
  limit?: number;
  search?: string;
  is_published?: boolean;
  access_type?: Exam["access_type"];
}

export interface GetExamsResponse {
  data: Exam[];
  count: number;
}

export interface DuplicateExamRequest {
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Exam service for exam management operations
 * Accessible by teachers and admins
 */
export class ExamService {
  /**
   * Generate a unique exam code
   */
  private static generateExamCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate exam data
   */
  private static validateExamData(data: CreateExamRequest): void {
    if (!data.title?.trim()) {
      throw new SupabaseError("Exam title is required", "VALIDATION_ERROR");
    }

    if (data.title.length > 200) {
      throw new SupabaseError(
        "Exam title must be less than 200 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.description && data.description.length > 1000) {
      throw new SupabaseError(
        "Exam description must be less than 1000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (!data.start_time || !data.end_time) {
      throw new SupabaseError(
        "Start time and end time are required",
        "VALIDATION_ERROR"
      );
    }

    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);
    const now = new Date();

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new SupabaseError("Invalid date format", "VALIDATION_ERROR");
    }

    if (startTime >= endTime) {
      throw new SupabaseError(
        "End time must be after start time",
        "VALIDATION_ERROR"
      );
    }

    if (startTime < now) {
      throw new SupabaseError(
        "Start time cannot be in the past",
        "VALIDATION_ERROR"
      );
    }

    if (!data.duration || data.duration < 1 || data.duration > 480) {
      throw new SupabaseError(
        "Duration must be between 1 and 480 minutes",
        "VALIDATION_ERROR"
      );
    }

    if (!["invitation", "code", "open"].includes(data.access_type)) {
      throw new SupabaseError("Invalid access type", "VALIDATION_ERROR");
    }

    if (
      data.access_type === "code" &&
      data.exam_code &&
      data.exam_code.length !== 6
    ) {
      throw new SupabaseError(
        "Exam code must be exactly 6 characters",
        "VALIDATION_ERROR"
      );
    }

    if (
      data.max_attempts &&
      (data.max_attempts < 1 || data.max_attempts > 10)
    ) {
      throw new SupabaseError(
        "Max attempts must be between 1 and 10",
        "VALIDATION_ERROR"
      );
    }

    if (
      data.max_violations &&
      (data.max_violations < 1 || data.max_violations > 20)
    ) {
      throw new SupabaseError(
        "Max violations must be between 1 and 20",
        "VALIDATION_ERROR"
      );
    }
  }

  /**
   * Check if exam code is unique
   */
  private static async isExamCodeUnique(
    examCode: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = supabase.from("exams").select("id").eq("exam_code", examCode);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new SupabaseError(error.message, "CODE_CHECK_ERROR");
      }

      return !data || data.length === 0;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to check exam code uniqueness",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create a new exam
   */
  static async createExam(
    userId: string,
    examData: CreateExamRequest
  ): Promise<Exam> {
    try {
      // Validate exam data
      this.validateExamData(examData);

      // Generate exam code if needed
      let examCode = examData.exam_code;
      if (examData.access_type === "code") {
        if (!examCode) {
          // Generate unique code
          let attempts = 0;
          do {
            examCode = this.generateExamCode();
            attempts++;
            if (attempts > 10) {
              throw new SupabaseError(
                "Failed to generate unique exam code",
                "CODE_GENERATION_ERROR"
              );
            }
          } while (!(await this.isExamCodeUnique(examCode)));
        } else {
          // Check if provided code is unique
          if (!(await this.isExamCodeUnique(examCode))) {
            throw new SupabaseError(
              "Exam code already exists",
              "DUPLICATE_CODE_ERROR"
            );
          }
        }
      }

      // Prepare exam data
      const newExamData = {
        title: examData.title.trim(),
        description: examData.description?.trim() || null,
        exam_code: examCode || null,
        created_by: userId,
        start_time: examData.start_time,
        end_time: examData.end_time,
        duration: examData.duration,
        total_marks: 0, // Will be calculated when questions are added
        is_published: false,
        access_type: examData.access_type,
        max_attempts: examData.max_attempts || 1,
        shuffle_questions: examData.shuffle_questions || false,
        show_results_immediately: examData.show_results_immediately || false,
        require_webcam: examData.require_webcam !== false, // Default to true
        max_violations: examData.max_violations || 3,
      };

      // Insert exam
      const { data: exam, error } = await supabase
        .from("exams")
        .insert(newExamData)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "EXAM_CREATE_ERROR");
      }

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to create exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get paginated list of exams for a teacher
   */
  static async getExams(
    userId: string,
    options: GetExamsOptions = {}
  ): Promise<GetExamsResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        is_published,
        access_type,
      } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("exams")
        .select("*", { count: "exact" })
        .eq("created_by", userId);

      // Apply filters
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (is_published !== undefined) {
        query = query.eq("is_published", is_published);
      }

      if (access_type) {
        query = query.eq("access_type", access_type);
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: exams, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "EXAMS_FETCH_ERROR");
      }

      return {
        data: exams || [],
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to fetch exams", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get exam by ID (only if user is the creator)
   */
  static async getExamById(
    userId: string,
    examId: string
  ): Promise<Exam | null> {
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .eq("created_by", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Exam not found or not owned by user
        }
        throw new SupabaseError(error.message, "EXAM_FETCH_ERROR");
      }

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to fetch exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Update exam
   */
  static async updateExam(
    userId: string,
    examId: string,
    updates: UpdateExamRequest
  ): Promise<Exam> {
    try {
      // Get existing exam to verify ownership
      const existingExam = await this.getExamById(userId, examId);
      if (!existingExam) {
        throw new SupabaseError(
          "Exam not found or access denied",
          "EXAM_NOT_FOUND"
        );
      }

      // Validate updates if they include exam data
      if (
        updates.title ||
        updates.start_time ||
        updates.end_time ||
        updates.duration
      ) {
        const validationData = {
          title: updates.title || existingExam.title,
          description:
            updates.description !== undefined
              ? updates.description
              : existingExam.description,
          start_time: updates.start_time || existingExam.start_time,
          end_time: updates.end_time || existingExam.end_time,
          duration: updates.duration || existingExam.duration,
          access_type: updates.access_type || existingExam.access_type,
          exam_code:
            updates.exam_code !== undefined
              ? updates.exam_code
              : existingExam.exam_code,
          max_attempts:
            updates.max_attempts !== undefined
              ? updates.max_attempts
              : existingExam.max_attempts,
          shuffle_questions:
            updates.shuffle_questions !== undefined
              ? updates.shuffle_questions
              : existingExam.shuffle_questions,
          show_results_immediately:
            updates.show_results_immediately !== undefined
              ? updates.show_results_immediately
              : existingExam.show_results_immediately,
          require_webcam:
            updates.require_webcam !== undefined
              ? updates.require_webcam
              : existingExam.require_webcam,
          max_violations:
            updates.max_violations !== undefined
              ? updates.max_violations
              : existingExam.max_violations,
        };

        this.validateExamData(validationData);
      }

      // Handle exam code changes
      if (
        updates.exam_code !== undefined &&
        updates.exam_code !== existingExam.exam_code
      ) {
        if (
          updates.exam_code &&
          !(await this.isExamCodeUnique(updates.exam_code, examId))
        ) {
          throw new SupabaseError(
            "Exam code already exists",
            "DUPLICATE_CODE_ERROR"
          );
        }
      }

      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Update exam
      const { data: exam, error } = await supabase
        .from("exams")
        .update(updateData)
        .eq("id", examId)
        .eq("created_by", userId)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "EXAM_UPDATE_ERROR");
      }

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to update exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Duplicate an exam
   */
  static async duplicateExam(
    userId: string,
    examId: string,
    duplicateData: DuplicateExamRequest
  ): Promise<Exam> {
    try {
      // Get original exam
      const originalExam = await this.getExamById(userId, examId);
      if (!originalExam) {
        throw new SupabaseError(
          "Exam not found or access denied",
          "EXAM_NOT_FOUND"
        );
      }

      // Prepare new exam data
      const newExamData: CreateExamRequest = {
        title: duplicateData.title,
        description:
          duplicateData.description || originalExam.description || undefined,
        start_time:
          duplicateData.start_time ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
        end_time:
          duplicateData.end_time ||
          new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Default to tomorrow + 1 hour
        duration: originalExam.duration,
        access_type: originalExam.access_type,
        max_attempts: originalExam.max_attempts,
        shuffle_questions: originalExam.shuffle_questions,
        show_results_immediately: originalExam.show_results_immediately,
        require_webcam: originalExam.require_webcam,
        max_violations: originalExam.max_violations,
      };

      // Create new exam
      const newExam = await this.createExam(userId, newExamData);

      // Copy questions from original exam
      await this.copyExamQuestions(originalExam.id, newExam.id);

      return newExam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to duplicate exam",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Copy questions from one exam to another
   */
  private static async copyExamQuestions(
    sourceExamId: string,
    targetExamId: string
  ): Promise<void> {
    try {
      // Copy MCQ questions
      const { data: mcqQuestions, error: mcqError } = await supabase
        .from("mcq")
        .select("question_text, options, correct_option, marks")
        .eq("exam_id", sourceExamId)
        .is("user_id", null); // Only copy template questions, not user answers

      if (mcqError) {
        throw new SupabaseError(mcqError.message, "MCQ_COPY_ERROR");
      }

      if (mcqQuestions && mcqQuestions.length > 0) {
        const mcqInsertData = mcqQuestions.map((q) => ({
          ...q,
          exam_id: targetExamId,
        }));

        const { error: mcqInsertError } = await supabase
          .from("mcq")
          .insert(mcqInsertData);

        if (mcqInsertError) {
          throw new SupabaseError(mcqInsertError.message, "MCQ_INSERT_ERROR");
        }
      }

      // Copy SAQ questions
      const { data: saqQuestions, error: saqError } = await supabase
        .from("saq")
        .select("question_text, correct_answer, marks")
        .eq("exam_id", sourceExamId)
        .is("user_id", null);

      if (saqError) {
        throw new SupabaseError(saqError.message, "SAQ_COPY_ERROR");
      }

      if (saqQuestions && saqQuestions.length > 0) {
        const saqInsertData = saqQuestions.map((q) => ({
          ...q,
          exam_id: targetExamId,
        }));

        const { error: saqInsertError } = await supabase
          .from("saq")
          .insert(saqInsertData);

        if (saqInsertError) {
          throw new SupabaseError(saqInsertError.message, "SAQ_INSERT_ERROR");
        }
      }

      // Copy Coding questions
      const { data: codingQuestions, error: codingError } = await supabase
        .from("coding")
        .select("question_text, starter_code, expected_output, marks, language")
        .eq("exam_id", sourceExamId)
        .is("user_id", null);

      if (codingError) {
        throw new SupabaseError(codingError.message, "CODING_COPY_ERROR");
      }

      if (codingQuestions && codingQuestions.length > 0) {
        const codingInsertData = codingQuestions.map((q) => ({
          ...q,
          exam_id: targetExamId,
        }));

        const { error: codingInsertError } = await supabase
          .from("coding")
          .insert(codingInsertData);

        if (codingInsertError) {
          throw new SupabaseError(
            codingInsertError.message,
            "CODING_INSERT_ERROR"
          );
        }
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to copy exam questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Delete exam (soft delete by marking as archived)
   */
  static async deleteExam(userId: string, examId: string): Promise<void> {
    try {
      // Verify ownership
      const exam = await this.getExamById(userId, examId);
      if (!exam) {
        throw new SupabaseError(
          "Exam not found or access denied",
          "EXAM_NOT_FOUND"
        );
      }

      // Check if exam has active sessions
      const { data: activeSessions, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("id")
        .eq("exam_id", examId)
        .in("status", ["in_progress", "not_started"]);

      if (sessionError) {
        throw new SupabaseError(sessionError.message, "SESSION_CHECK_ERROR");
      }

      if (activeSessions && activeSessions.length > 0) {
        throw new SupabaseError(
          "Cannot delete exam with active sessions",
          "ACTIVE_SESSIONS_ERROR"
        );
      }

      // Soft delete by updating title to indicate deletion
      const { error } = await supabase
        .from("exams")
        .update({
          title: `[DELETED] ${exam.title}`,
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", examId)
        .eq("created_by", userId);

      if (error) {
        throw new SupabaseError(error.message, "EXAM_DELETE_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to delete exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Archive exam (mark as archived but keep accessible)
   */
  static async archiveExam(userId: string, examId: string): Promise<Exam> {
    try {
      const exam = await this.updateExam(userId, examId, {
        is_published: false,
        title: `[ARCHIVED] ${(await this.getExamById(userId, examId))?.title}`,
      });

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to archive exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get exam statistics for a teacher
   */
  static async getExamStats(userId: string): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  }> {
    try {
      const { data: exams, error } = await supabase
        .from("exams")
        .select("is_published, title")
        .eq("created_by", userId);

      if (error) {
        throw new SupabaseError(error.message, "STATS_FETCH_ERROR");
      }

      const total = exams?.length || 0;
      const published =
        exams?.filter((e) => e.is_published && !e.title.startsWith("["))
          .length || 0;
      const draft =
        exams?.filter((e) => !e.is_published && !e.title.startsWith("["))
          .length || 0;
      const archived =
        exams?.filter((e) => e.title.startsWith("[")).length || 0;

      return { total, published, draft, archived };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch exam statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Publish exam (make it available to students)
   */
  static async publishExam(userId: string, examId: string): Promise<Exam> {
    try {
      // Verify exam has questions
      const [mcqCount, saqCount, codingCount] = await Promise.all([
        supabase
          .from("mcq")
          .select("id", { count: "exact" })
          .eq("exam_id", examId)
          .is("user_id", null),
        supabase
          .from("saq")
          .select("id", { count: "exact" })
          .eq("exam_id", examId)
          .is("user_id", null),
        supabase
          .from("coding")
          .select("id", { count: "exact" })
          .eq("exam_id", examId)
          .is("user_id", null),
      ]);

      const totalQuestions =
        (mcqCount.count || 0) +
        (saqCount.count || 0) +
        (codingCount.count || 0);

      if (totalQuestions === 0) {
        throw new SupabaseError(
          "Cannot publish exam without questions",
          "NO_QUESTIONS_ERROR"
        );
      }

      // Calculate total marks
      const [mcqMarks, saqMarks, codingMarks] = await Promise.all([
        supabase
          .from("mcq")
          .select("marks")
          .eq("exam_id", examId)
          .is("user_id", null),
        supabase
          .from("saq")
          .select("marks")
          .eq("exam_id", examId)
          .is("user_id", null),
        supabase
          .from("coding")
          .select("marks")
          .eq("exam_id", examId)
          .is("user_id", null),
      ]);

      const totalMarks = [
        ...(mcqMarks.data || []),
        ...(saqMarks.data || []),
        ...(codingMarks.data || []),
      ].reduce((sum, q) => sum + (q.marks || 0), 0);

      // Update exam
      const exam = await this.updateExam(userId, examId, {
        is_published: true,
        total_marks: totalMarks,
      });

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to publish exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Unpublish exam
   */
  static async unpublishExam(userId: string, examId: string): Promise<Exam> {
    try {
      const exam = await this.updateExam(userId, examId, {
        is_published: false,
      });

      return exam;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to unpublish exam",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
