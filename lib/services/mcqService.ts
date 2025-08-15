import { supabase, SupabaseError } from "../supabaseClient";
import { MCQQuestion } from "../../types/database";

export interface CreateMCQRequest {
  exam_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

export interface UpdateMCQRequest extends Partial<CreateMCQRequest> {
  id: string;
}

export interface GetMCQsOptions {
  page?: number;
  limit?: number;
  search?: string;
  exam_id?: string;
}

export interface GetMCQsResponse {
  data: MCQQuestion[];
  count: number;
}

export interface BulkMCQOperation {
  action: "delete" | "reorder" | "update_marks";
  question_ids: string[];
  data?: any;
}

export interface ImportMCQData {
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

export interface ExportMCQData extends ImportMCQData {
  id: string;
}

/**
 * MCQ Question service for managing multiple choice questions
 * Accessible by teachers and admins
 */
export class MCQService {
  /**
   * Validate MCQ question data
   */
  private static validateMCQData(data: CreateMCQRequest): void {
    if (!data.question_text?.trim()) {
      throw new SupabaseError("Question text is required", "VALIDATION_ERROR");
    }

    if (data.question_text.length > 2000) {
      throw new SupabaseError(
        "Question text must be less than 2000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (
      !data.options ||
      !Array.isArray(data.options) ||
      data.options.length < 2
    ) {
      throw new SupabaseError(
        "At least 2 options are required",
        "VALIDATION_ERROR"
      );
    }

    if (data.options.length > 6) {
      throw new SupabaseError(
        "Maximum 6 options are allowed",
        "VALIDATION_ERROR"
      );
    }

    // Validate each option
    data.options.forEach((option, index) => {
      if (!option?.trim()) {
        throw new SupabaseError(
          `Option ${index + 1} cannot be empty`,
          "VALIDATION_ERROR"
        );
      }
      if (option.length > 500) {
        throw new SupabaseError(
          `Option ${index + 1} must be less than 500 characters`,
          "VALIDATION_ERROR"
        );
      }
    });

    // Check for duplicate options
    const uniqueOptions = new Set(
      data.options.map((opt) => opt.trim().toLowerCase())
    );
    if (uniqueOptions.size !== data.options.length) {
      throw new SupabaseError("Options must be unique", "VALIDATION_ERROR");
    }

    if (
      data.correct_option === undefined ||
      data.correct_option < 0 ||
      data.correct_option >= data.options.length
    ) {
      throw new SupabaseError(
        "Valid correct option index is required",
        "VALIDATION_ERROR"
      );
    }

    if (!data.marks || data.marks < 0.5 || data.marks > 100) {
      throw new SupabaseError(
        "Marks must be between 0.5 and 100",
        "VALIDATION_ERROR"
      );
    }

    if (!data.exam_id?.trim()) {
      throw new SupabaseError("Exam ID is required", "VALIDATION_ERROR");
    }
  }

  /**
   * Verify user has access to exam
   */
  private static async verifyExamAccess(
    userId: string,
    examId: string
  ): Promise<void> {
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("id, created_by")
        .eq("id", examId)
        .eq("created_by", userId)
        .single();

      if (error || !exam) {
        throw new SupabaseError(
          "Exam not found or access denied",
          "EXAM_ACCESS_DENIED"
        );
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify exam access",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create a new MCQ question
   */
  static async createMCQ(
    userId: string,
    mcqData: CreateMCQRequest
  ): Promise<MCQQuestion> {
    try {
      // Validate MCQ data
      this.validateMCQData(mcqData);

      // Verify user has access to exam
      await this.verifyExamAccess(userId, mcqData.exam_id);

      // Prepare MCQ data
      const newMCQData = {
        exam_id: mcqData.exam_id,
        question_text: mcqData.question_text.trim(),
        options: mcqData.options.map((opt) => opt.trim()),
        correct_option: mcqData.correct_option,
        marks: mcqData.marks,
        user_id: null, // Template question, not user answer
      };

      // Insert MCQ
      const { data: mcq, error } = await supabase
        .from("mcq")
        .insert(newMCQData)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "MCQ_CREATE_ERROR");
      }

      return mcq;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create MCQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get paginated list of MCQ questions
   */
  static async getMCQs(
    userId: string,
    options: GetMCQsOptions = {}
  ): Promise<GetMCQsResponse> {
    try {
      const { page = 1, limit = 10, search, exam_id } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("mcq")
        .select("*", { count: "exact" })
        .is("user_id", null); // Only template questions, not user answers

      // Filter by exam if specified
      if (exam_id) {
        // Verify user has access to exam
        await this.verifyExamAccess(userId, exam_id);
        query = query.eq("exam_id", exam_id);
      } else {
        // Filter by user's exams
        const { data: userExams, error: examError } = await supabase
          .from("exams")
          .select("id")
          .eq("created_by", userId);

        if (examError) {
          throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
        }

        const examIds = userExams?.map((exam) => exam.id) || [];
        if (examIds.length === 0) {
          return { data: [], count: 0 };
        }

        query = query.in("exam_id", examIds);
      }

      // Apply search filter
      if (search) {
        query = query.ilike("question_text", `%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: mcqs, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "MCQ_FETCH_ERROR");
      }

      return {
        data: mcqs || [],
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch MCQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get MCQ question by ID
   */
  static async getMCQById(
    userId: string,
    mcqId: string
  ): Promise<MCQQuestion | null> {
    try {
      const { data: mcq, error } = await supabase
        .from("mcq")
        .select(
          `
          *,
          exams!inner(created_by)
        `
        )
        .eq("id", mcqId)
        .is("user_id", null)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // MCQ not found
        }
        throw new SupabaseError(error.message, "MCQ_FETCH_ERROR");
      }

      // Check if user owns the exam
      if ((mcq as any).exams.created_by !== userId) {
        throw new SupabaseError(
          "MCQ not found or access denied",
          "MCQ_ACCESS_DENIED"
        );
      }

      // Remove the joined exam data
      const { exams, ...mcqData } = mcq as any;
      return mcqData;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch MCQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  } /**

   * Update MCQ question
   */
  static async updateMCQ(
    userId: string,
    updateData: UpdateMCQRequest
  ): Promise<MCQQuestion> {
    try {
      const { id, ...mcqData } = updateData;

      // Get existing MCQ to verify ownership
      const existingMCQ = await this.getMCQById(userId, id);
      if (!existingMCQ) {
        throw new SupabaseError(
          "MCQ not found or access denied",
          "MCQ_NOT_FOUND"
        );
      }

      // Validate updates if they include MCQ data
      if (
        mcqData.question_text ||
        mcqData.options ||
        mcqData.correct_option !== undefined ||
        mcqData.marks
      ) {
        const validationData = {
          exam_id: mcqData.exam_id || existingMCQ.exam_id,
          question_text: mcqData.question_text || existingMCQ.question_text,
          options: mcqData.options || existingMCQ.options,
          correct_option:
            mcqData.correct_option !== undefined
              ? mcqData.correct_option
              : existingMCQ.correct_option!,
          marks: mcqData.marks || existingMCQ.marks!,
        };

        this.validateMCQData(validationData);
      }

      // Prepare update data
      const updatePayload = {
        ...mcqData,
        question_text: mcqData.question_text?.trim(),
        options: mcqData.options?.map((opt) => opt.trim()),
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
          delete updatePayload[key as keyof typeof updatePayload];
        }
      });

      // Update MCQ
      const { data: mcq, error } = await supabase
        .from("mcq")
        .update(updatePayload)
        .eq("id", id)
        .is("user_id", null)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "MCQ_UPDATE_ERROR");
      }

      return mcq;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to update MCQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Delete MCQ question
   */
  static async deleteMCQ(userId: string, mcqId: string): Promise<void> {
    try {
      // Verify ownership
      const mcq = await this.getMCQById(userId, mcqId);
      if (!mcq) {
        throw new SupabaseError(
          "MCQ not found or access denied",
          "MCQ_NOT_FOUND"
        );
      }

      // Check if exam is published
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("is_published")
        .eq("id", mcq.exam_id)
        .single();

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_CHECK_ERROR");
      }

      if (exam.is_published) {
        throw new SupabaseError(
          "Cannot delete questions from published exam",
          "PUBLISHED_EXAM_ERROR"
        );
      }

      // Delete MCQ
      const { error } = await supabase
        .from("mcq")
        .delete()
        .eq("id", mcqId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "MCQ_DELETE_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to delete MCQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Bulk operations on MCQ questions
   */
  static async bulkMCQOperation(
    userId: string,
    operation: BulkMCQOperation
  ): Promise<void> {
    try {
      const { action, question_ids, data } = operation;

      if (!question_ids || question_ids.length === 0) {
        throw new SupabaseError("No questions selected", "VALIDATION_ERROR");
      }

      // Verify ownership of all questions
      const { data: mcqs, error: fetchError } = await supabase
        .from("mcq")
        .select(
          `
          id,
          exam_id,
          exams!inner(created_by, is_published)
        `
        )
        .in("id", question_ids)
        .is("user_id", null);

      if (fetchError) {
        throw new SupabaseError(fetchError.message, "MCQ_FETCH_ERROR");
      }

      if (!mcqs || mcqs.length !== question_ids.length) {
        throw new SupabaseError(
          "Some questions not found or access denied",
          "MCQ_ACCESS_DENIED"
        );
      }

      // Check ownership and published status
      for (const mcq of mcqs) {
        if ((mcq as any).exams.created_by !== userId) {
          throw new SupabaseError(
            "Access denied to some questions",
            "MCQ_ACCESS_DENIED"
          );
        }
        if ((mcq as any).exams.is_published && action !== "reorder") {
          throw new SupabaseError(
            "Cannot modify questions in published exam",
            "PUBLISHED_EXAM_ERROR"
          );
        }
      }

      switch (action) {
        case "delete":
          await this.bulkDeleteMCQs(question_ids);
          break;
        case "reorder":
          await this.reorderMCQs(question_ids, data?.order || []);
          break;
        case "update_marks":
          await this.bulkUpdateMarks(question_ids, data?.marks);
          break;
        default:
          throw new SupabaseError("Invalid bulk operation", "VALIDATION_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to perform bulk operation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Bulk delete MCQ questions
   */
  private static async bulkDeleteMCQs(questionIds: string[]): Promise<void> {
    const { error } = await supabase
      .from("mcq")
      .delete()
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_DELETE_ERROR");
    }
  }

  /**
   * Reorder MCQ questions (placeholder - would need additional order field in DB)
   */
  private static async reorderMCQs(
    questionIds: string[],
    order: number[]
  ): Promise<void> {
    // Note: This would require an 'order' or 'position' field in the MCQ table
    // For now, we'll just validate the operation
    if (order.length !== questionIds.length) {
      throw new SupabaseError(
        "Order array must match question count",
        "VALIDATION_ERROR"
      );
    }

    // In a real implementation, you would update each question's order field
    // For now, this is a placeholder that doesn't actually reorder
    console.log(
      "Reorder operation requested but not implemented - requires order field in database"
    );
  }

  /**
   * Bulk update marks for MCQ questions
   */
  private static async bulkUpdateMarks(
    questionIds: string[],
    marks: number
  ): Promise<void> {
    if (!marks || marks < 0.5 || marks > 100) {
      throw new SupabaseError(
        "Marks must be between 0.5 and 100",
        "VALIDATION_ERROR"
      );
    }

    const { error } = await supabase
      .from("mcq")
      .update({ marks })
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_UPDATE_ERROR");
    }
  }

  /**
   * Import MCQ questions from data array
   */
  static async importMCQs(
    userId: string,
    examId: string,
    mcqData: ImportMCQData[]
  ): Promise<MCQQuestion[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      if (!mcqData || mcqData.length === 0) {
        throw new SupabaseError("No MCQ data provided", "VALIDATION_ERROR");
      }

      if (mcqData.length > 100) {
        throw new SupabaseError(
          "Cannot import more than 100 questions at once",
          "VALIDATION_ERROR"
        );
      }

      // Validate all MCQ data
      const validatedData = mcqData.map((mcq, index) => {
        try {
          const mcqWithExamId = { ...mcq, exam_id: examId };
          this.validateMCQData(mcqWithExamId);
          return {
            exam_id: examId,
            question_text: mcq.question_text.trim(),
            options: mcq.options.map((opt) => opt.trim()),
            correct_option: mcq.correct_option,
            marks: mcq.marks,
            user_id: null,
          };
        } catch (error) {
          throw new SupabaseError(
            `Validation error in question ${index + 1}: ${
              error instanceof SupabaseError ? error.message : "Invalid data"
            }`,
            "VALIDATION_ERROR"
          );
        }
      });

      // Insert all MCQs
      const { data: importedMCQs, error } = await supabase
        .from("mcq")
        .insert(validatedData)
        .select();

      if (error) {
        throw new SupabaseError(error.message, "MCQ_IMPORT_ERROR");
      }

      return importedMCQs || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to import MCQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Export MCQ questions for an exam
   */
  static async exportMCQs(
    userId: string,
    examId: string
  ): Promise<ExportMCQData[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: mcqs, error } = await supabase
        .from("mcq")
        .select("id, question_text, options, correct_option, marks")
        .eq("exam_id", examId)
        .is("user_id", null)
        .order("created_at", { ascending: true });

      if (error) {
        throw new SupabaseError(error.message, "MCQ_EXPORT_ERROR");
      }

      return mcqs || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to export MCQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get MCQ questions for question bank (reusable questions)
   */
  static async getQuestionBank(
    userId: string,
    options: { search?: string; limit?: number } = {}
  ): Promise<MCQQuestion[]> {
    try {
      const { search, limit = 50 } = options;

      // Get user's exams
      const { data: userExams, error: examError } = await supabase
        .from("exams")
        .select("id")
        .eq("created_by", userId);

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
      }

      const examIds = userExams?.map((exam) => exam.id) || [];
      if (examIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("mcq")
        .select("*")
        .in("exam_id", examIds)
        .is("user_id", null);

      // Apply search filter
      if (search) {
        query = query.ilike("question_text", `%${search}%`);
      }

      // Apply limit and ordering
      query = query.limit(limit).order("created_at", { ascending: false });

      const { data: mcqs, error } = await query;

      if (error) {
        throw new SupabaseError(error.message, "QUESTION_BANK_ERROR");
      }

      return mcqs || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch question bank",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Copy MCQ question to another exam
   */
  static async copyMCQToExam(
    userId: string,
    mcqId: string,
    targetExamId: string
  ): Promise<MCQQuestion> {
    try {
      // Get source MCQ
      const sourceMCQ = await this.getMCQById(userId, mcqId);
      if (!sourceMCQ) {
        throw new SupabaseError(
          "Source MCQ not found or access denied",
          "MCQ_NOT_FOUND"
        );
      }

      // Verify access to target exam
      await this.verifyExamAccess(userId, targetExamId);

      // Create new MCQ in target exam
      const newMCQData: CreateMCQRequest = {
        exam_id: targetExamId,
        question_text: sourceMCQ.question_text,
        options: sourceMCQ.options,
        correct_option: sourceMCQ.correct_option!,
        marks: sourceMCQ.marks!,
      };

      return await this.createMCQ(userId, newMCQData);
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to copy MCQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get MCQ statistics for an exam
   */
  static async getMCQStats(
    userId: string,
    examId: string
  ): Promise<{
    total: number;
    totalMarks: number;
    averageMarks: number;
    optionDistribution: { [key: number]: number };
  }> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: mcqs, error } = await supabase
        .from("mcq")
        .select("marks, correct_option, options")
        .eq("exam_id", examId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "MCQ_STATS_ERROR");
      }

      const total = mcqs?.length || 0;
      const totalMarks =
        mcqs?.reduce((sum, mcq) => sum + (mcq.marks || 0), 0) || 0;
      const averageMarks = total > 0 ? totalMarks / total : 0;

      // Calculate option distribution (how many questions have 2, 3, 4, etc. options)
      const optionDistribution: { [key: number]: number } = {};
      mcqs?.forEach((mcq) => {
        const optionCount = mcq.options?.length || 0;
        optionDistribution[optionCount] =
          (optionDistribution[optionCount] || 0) + 1;
      });

      return {
        total,
        totalMarks,
        averageMarks: Math.round(averageMarks * 100) / 100,
        optionDistribution,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get MCQ statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
