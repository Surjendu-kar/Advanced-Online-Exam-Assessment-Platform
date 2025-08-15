import { supabase, SupabaseError } from "../supabaseClient";
import { SAQQuestion } from "../../types/database";

export interface CreateSAQRequest {
  exam_id: string;
  question_text: string;
  correct_answer?: string;
  answer_guidelines?: string;
  marking_criteria?: string;
  marks: number;
}

export interface UpdateSAQRequest extends Partial<CreateSAQRequest> {
  id: string;
}

export interface GetSAQsOptions {
  page?: number;
  limit?: number;
  search?: string;
  exam_id?: string;
}

export interface GetSAQsResponse {
  data: SAQQuestion[];
  count: number;
}

export interface BulkSAQOperation {
  action: "delete" | "reorder" | "update_marks";
  question_ids: string[];
  data?: any;
}

export interface ImportSAQData {
  question_text: string;
  correct_answer?: string;
  answer_guidelines?: string;
  marking_criteria?: string;
  marks: number;
}

export interface ExportSAQData extends ImportSAQData {
  id: string;
}

export interface SAQTemplate {
  id: string;
  name: string;
  description: string;
  question_text: string;
  answer_guidelines?: string;
  marking_criteria?: string;
  suggested_marks: number;
  category: string;
}

/**
 * SAQ Question service for managing short answer questions
 * Accessible by teachers and admins
 */
export class SAQService {
  /**
   * Validate SAQ question data
   */
  private static validateSAQData(data: CreateSAQRequest): void {
    if (!data.question_text?.trim()) {
      throw new SupabaseError("Question text is required", "VALIDATION_ERROR");
    }

    if (data.question_text.length > 5000) {
      throw new SupabaseError(
        "Question text must be less than 5000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.correct_answer && data.correct_answer.length > 2000) {
      throw new SupabaseError(
        "Correct answer must be less than 2000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.answer_guidelines && data.answer_guidelines.length > 1000) {
      throw new SupabaseError(
        "Answer guidelines must be less than 1000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.marking_criteria && data.marking_criteria.length > 1000) {
      throw new SupabaseError(
        "Marking criteria must be less than 1000 characters",
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
   * Create a new SAQ question
   */
  static async createSAQ(
    userId: string,
    saqData: CreateSAQRequest
  ): Promise<SAQQuestion> {
    try {
      // Validate SAQ data
      this.validateSAQData(saqData);

      // Verify user has access to exam
      await this.verifyExamAccess(userId, saqData.exam_id);

      // Prepare SAQ data
      const newSAQData = {
        exam_id: saqData.exam_id,
        question_text: saqData.question_text.trim(),
        correct_answer: saqData.correct_answer?.trim() || null,
        answer_guidelines: saqData.answer_guidelines?.trim() || null,
        marking_criteria: saqData.marking_criteria?.trim() || null,
        marks: saqData.marks,
        user_id: null, // Template question, not user answer
      };

      // Insert SAQ
      const { data: saq, error } = await supabase
        .from("saq")
        .insert(newSAQData)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "SAQ_CREATE_ERROR");
      }

      return saq;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get paginated list of SAQ questions
   */
  static async getSAQs(
    userId: string,
    options: GetSAQsOptions = {}
  ): Promise<GetSAQsResponse> {
    try {
      const { page = 1, limit = 10, search, exam_id } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("saq")
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
        query = query.or(
          `question_text.ilike.%${search}%,correct_answer.ilike.%${search}%`
        );
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: saqs, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "SAQ_FETCH_ERROR");
      }

      return {
        data: saqs || [],
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch SAQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get SAQ question by ID
   */
  static async getSAQById(
    userId: string,
    saqId: string
  ): Promise<SAQQuestion | null> {
    try {
      const { data: saq, error } = await supabase
        .from("saq")
        .select(
          `
          *,
          exams!inner(created_by)
        `
        )
        .eq("id", saqId)
        .is("user_id", null)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // SAQ not found
        }
        throw new SupabaseError(error.message, "SAQ_FETCH_ERROR");
      }

      // Check if user owns the exam
      if ((saq as any).exams.created_by !== userId) {
        throw new SupabaseError(
          "SAQ not found or access denied",
          "SAQ_ACCESS_DENIED"
        );
      }

      // Remove the joined exam data
      const { exams, ...saqData } = saq as any;
      return saqData;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Update SAQ question
   */
  static async updateSAQ(
    userId: string,
    updateData: UpdateSAQRequest
  ): Promise<SAQQuestion> {
    try {
      const { id, ...saqData } = updateData;

      // Get existing SAQ to verify ownership
      const existingSAQ = await this.getSAQById(userId, id);
      if (!existingSAQ) {
        throw new SupabaseError(
          "SAQ not found or access denied",
          "SAQ_NOT_FOUND"
        );
      }

      // Validate updates if they include SAQ data
      if (saqData.question_text || saqData.correct_answer || saqData.marks) {
        const validationData = {
          exam_id: saqData.exam_id || existingSAQ.exam_id,
          question_text: saqData.question_text || existingSAQ.question_text,
          correct_answer:
            saqData.correct_answer !== undefined
              ? saqData.correct_answer
              : existingSAQ.correct_answer,
          answer_guidelines:
            saqData.answer_guidelines !== undefined
              ? saqData.answer_guidelines
              : (existingSAQ as any).answer_guidelines,
          marking_criteria:
            saqData.marking_criteria !== undefined
              ? saqData.marking_criteria
              : (existingSAQ as any).marking_criteria,
          marks: saqData.marks || existingSAQ.marks!,
        };

        this.validateSAQData(validationData);
      }

      // Prepare update data
      const updatePayload = {
        ...saqData,
        question_text: saqData.question_text?.trim(),
        correct_answer: saqData.correct_answer?.trim(),
        answer_guidelines: saqData.answer_guidelines?.trim(),
        marking_criteria: saqData.marking_criteria?.trim(),
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
          delete updatePayload[key as keyof typeof updatePayload];
        }
      });

      // Update SAQ
      const { data: saq, error } = await supabase
        .from("saq")
        .update(updatePayload)
        .eq("id", id)
        .is("user_id", null)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "SAQ_UPDATE_ERROR");
      }

      return saq;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to update SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Delete SAQ question
   */
  static async deleteSAQ(userId: string, saqId: string): Promise<void> {
    try {
      // Verify ownership
      const saq = await this.getSAQById(userId, saqId);
      if (!saq) {
        throw new SupabaseError(
          "SAQ not found or access denied",
          "SAQ_NOT_FOUND"
        );
      }

      // Check if exam is published
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("is_published")
        .eq("id", saq.exam_id)
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

      // Delete SAQ
      const { error } = await supabase
        .from("saq")
        .delete()
        .eq("id", saqId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "SAQ_DELETE_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to delete SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  } /**
   *
 Bulk operations on SAQ questions
   */
  static async bulkSAQOperation(
    userId: string,
    operation: BulkSAQOperation
  ): Promise<void> {
    try {
      const { action, question_ids, data } = operation;

      if (!question_ids || question_ids.length === 0) {
        throw new SupabaseError("No questions selected", "VALIDATION_ERROR");
      }

      // Verify ownership of all questions
      const { data: saqs, error: fetchError } = await supabase
        .from("saq")
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
        throw new SupabaseError(fetchError.message, "SAQ_FETCH_ERROR");
      }

      if (!saqs || saqs.length !== question_ids.length) {
        throw new SupabaseError(
          "Some questions not found or access denied",
          "SAQ_ACCESS_DENIED"
        );
      }

      // Check ownership and published status
      for (const saq of saqs) {
        if ((saq as any).exams.created_by !== userId) {
          throw new SupabaseError(
            "Access denied to some questions",
            "SAQ_ACCESS_DENIED"
          );
        }
        if ((saq as any).exams.is_published && action !== "reorder") {
          throw new SupabaseError(
            "Cannot modify questions in published exam",
            "PUBLISHED_EXAM_ERROR"
          );
        }
      }

      switch (action) {
        case "delete":
          await this.bulkDeleteSAQs(question_ids);
          break;
        case "reorder":
          await this.reorderSAQs(question_ids, data?.order || []);
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
   * Bulk delete SAQ questions
   */
  private static async bulkDeleteSAQs(questionIds: string[]): Promise<void> {
    const { error } = await supabase
      .from("saq")
      .delete()
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_DELETE_ERROR");
    }
  }

  /**
   * Reorder SAQ questions (placeholder - would need additional order field in DB)
   */
  private static async reorderSAQs(
    questionIds: string[],
    order: number[]
  ): Promise<void> {
    // Note: This would require an 'order' or 'position' field in the SAQ table
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
   * Bulk update marks for SAQ questions
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
      .from("saq")
      .update({ marks })
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_UPDATE_ERROR");
    }
  }

  /**
   * Import SAQ questions from data array
   */
  static async importSAQs(
    userId: string,
    examId: string,
    saqData: ImportSAQData[]
  ): Promise<SAQQuestion[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      if (!saqData || saqData.length === 0) {
        throw new SupabaseError("No SAQ data provided", "VALIDATION_ERROR");
      }

      if (saqData.length > 100) {
        throw new SupabaseError(
          "Cannot import more than 100 questions at once",
          "VALIDATION_ERROR"
        );
      }

      // Validate all SAQ data
      const validatedData = saqData.map((saq, index) => {
        try {
          const saqWithExamId = { ...saq, exam_id: examId };
          this.validateSAQData(saqWithExamId);
          return {
            exam_id: examId,
            question_text: saq.question_text.trim(),
            correct_answer: saq.correct_answer?.trim() || null,
            answer_guidelines: saq.answer_guidelines?.trim() || null,
            marking_criteria: saq.marking_criteria?.trim() || null,
            marks: saq.marks,
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

      // Insert all SAQs
      const { data: importedSAQs, error } = await supabase
        .from("saq")
        .insert(validatedData)
        .select();

      if (error) {
        throw new SupabaseError(error.message, "SAQ_IMPORT_ERROR");
      }

      return importedSAQs || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to import SAQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Export SAQ questions for an exam
   */
  static async exportSAQs(
    userId: string,
    examId: string
  ): Promise<ExportSAQData[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: saqs, error } = await supabase
        .from("saq")
        .select(
          "id, question_text, correct_answer, answer_guidelines, marking_criteria, marks"
        )
        .eq("exam_id", examId)
        .is("user_id", null)
        .order("created_at", { ascending: true });

      if (error) {
        throw new SupabaseError(error.message, "SAQ_EXPORT_ERROR");
      }

      return saqs || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to export SAQ questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  } /**

   * Get SAQ questions for question bank (reusable questions)
   */
  static async getQuestionBank(
    userId: string,
    options: { search?: string; limit?: number; category?: string } = {}
  ): Promise<SAQQuestion[]> {
    try {
      const { search, limit = 50, category } = options;

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
        .from("saq")
        .select("*")
        .in("exam_id", examIds)
        .is("user_id", null);

      // Apply search filter
      if (search) {
        query = query.or(
          `question_text.ilike.%${search}%,correct_answer.ilike.%${search}%`
        );
      }

      // Apply limit and ordering
      query = query.limit(limit).order("created_at", { ascending: false });

      const { data: saqs, error } = await query;

      if (error) {
        throw new SupabaseError(error.message, "QUESTION_BANK_ERROR");
      }

      return saqs || [];
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
   * Copy SAQ question to another exam
   */
  static async copySAQToExam(
    userId: string,
    saqId: string,
    targetExamId: string
  ): Promise<SAQQuestion> {
    try {
      // Get source SAQ
      const sourceSAQ = await this.getSAQById(userId, saqId);
      if (!sourceSAQ) {
        throw new SupabaseError(
          "Source SAQ not found or access denied",
          "SAQ_NOT_FOUND"
        );
      }

      // Verify access to target exam
      await this.verifyExamAccess(userId, targetExamId);

      // Create new SAQ in target exam
      const newSAQData: CreateSAQRequest = {
        exam_id: targetExamId,
        question_text: sourceSAQ.question_text,
        correct_answer: sourceSAQ.correct_answer || undefined,
        answer_guidelines: (sourceSAQ as any).answer_guidelines || undefined,
        marking_criteria: (sourceSAQ as any).marking_criteria || undefined,
        marks: sourceSAQ.marks!,
      };

      return await this.createSAQ(userId, newSAQData);
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to copy SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get SAQ statistics for an exam
   */
  static async getSAQStats(
    userId: string,
    examId: string
  ): Promise<{
    total: number;
    totalMarks: number;
    averageMarks: number;
    withGuidelines: number;
    withMarkingCriteria: number;
  }> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: saqs, error } = await supabase
        .from("saq")
        .select("marks, answer_guidelines, marking_criteria")
        .eq("exam_id", examId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "SAQ_STATS_ERROR");
      }

      const total = saqs?.length || 0;
      const totalMarks =
        saqs?.reduce((sum, saq) => sum + (saq.marks || 0), 0) || 0;
      const averageMarks = total > 0 ? totalMarks / total : 0;
      const withGuidelines =
        saqs?.filter((saq) => saq.answer_guidelines).length || 0;
      const withMarkingCriteria =
        saqs?.filter((saq) => saq.marking_criteria).length || 0;

      return {
        total,
        totalMarks,
        averageMarks: Math.round(averageMarks * 100) / 100,
        withGuidelines,
        withMarkingCriteria,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get SAQ statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get predefined SAQ templates for common question types
   */
  static getTemplates(): SAQTemplate[] {
    return [
      {
        id: "explain-concept",
        name: "Explain a Concept",
        description:
          "Template for asking students to explain a concept or theory",
        question_text:
          "Explain the concept of [CONCEPT] and provide an example.",
        answer_guidelines:
          "Students should define the concept clearly, explain its key characteristics, and provide a relevant example.",
        marking_criteria:
          "Full marks: Clear definition + explanation + relevant example. Partial marks: Missing one component.",
        suggested_marks: 5,
        category: "conceptual",
      },
      {
        id: "compare-contrast",
        name: "Compare and Contrast",
        description: "Template for comparison questions",
        question_text:
          "Compare and contrast [ITEM A] and [ITEM B]. Discuss their similarities and differences.",
        answer_guidelines:
          "Students should identify at least 2 similarities and 2 differences with explanations.",
        marking_criteria:
          "Full marks: 2+ similarities + 2+ differences with explanations. Partial marks for incomplete comparisons.",
        suggested_marks: 8,
        category: "analytical",
      },
      {
        id: "problem-solving",
        name: "Problem Solving",
        description: "Template for problem-solving questions",
        question_text:
          "Solve the following problem: [PROBLEM STATEMENT]. Show your working and explain your approach.",
        answer_guidelines:
          "Students should show clear steps, calculations, and reasoning for their solution.",
        marking_criteria:
          "Method (40%), Calculation (40%), Final Answer (20%). Partial marks for correct method even if final answer is wrong.",
        suggested_marks: 10,
        category: "problem-solving",
      },
      {
        id: "analyze-case",
        name: "Case Analysis",
        description: "Template for case study analysis",
        question_text:
          "Analyze the following case study: [CASE DESCRIPTION]. What are the key issues and what would you recommend?",
        answer_guidelines:
          "Students should identify key issues, analyze causes, and provide practical recommendations.",
        marking_criteria:
          "Issue identification (30%), Analysis (40%), Recommendations (30%).",
        suggested_marks: 12,
        category: "analytical",
      },
      {
        id: "evaluate-argument",
        name: "Evaluate Argument",
        description: "Template for critical evaluation questions",
        question_text:
          "Evaluate the following argument: [ARGUMENT]. Discuss its strengths and weaknesses.",
        answer_guidelines:
          "Students should critically assess the argument, identifying logical strengths and weaknesses.",
        marking_criteria:
          "Critical thinking (50%), Evidence/examples (30%), Clear reasoning (20%).",
        suggested_marks: 8,
        category: "critical-thinking",
      },
      {
        id: "describe-process",
        name: "Describe Process",
        description: "Template for process description questions",
        question_text:
          "Describe the process of [PROCESS]. Include the key steps and explain why each step is important.",
        answer_guidelines:
          "Students should list steps in correct order and explain the importance of each step.",
        marking_criteria:
          "Correct sequence (40%), Step explanations (40%), Completeness (20%).",
        suggested_marks: 6,
        category: "descriptive",
      },
    ];
  }

  /**
   * Create SAQ from template
   */
  static async createFromTemplate(
    userId: string,
    examId: string,
    templateId: string,
    customizations: {
      question_text?: string;
      answer_guidelines?: string;
      marking_criteria?: string;
      marks?: number;
    } = {}
  ): Promise<SAQQuestion> {
    try {
      const templates = this.getTemplates();
      const template = templates.find((t) => t.id === templateId);

      if (!template) {
        throw new SupabaseError("Template not found", "TEMPLATE_NOT_FOUND");
      }

      const saqData: CreateSAQRequest = {
        exam_id: examId,
        question_text: customizations.question_text || template.question_text,
        answer_guidelines:
          customizations.answer_guidelines || template.answer_guidelines,
        marking_criteria:
          customizations.marking_criteria || template.marking_criteria,
        marks: customizations.marks || template.suggested_marks,
      };

      return await this.createSAQ(userId, saqData);
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create SAQ from template",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
