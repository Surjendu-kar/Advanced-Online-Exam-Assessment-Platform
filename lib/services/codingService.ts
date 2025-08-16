import { supabase, SupabaseError } from "../supabaseClient";
import { CodingQuestion } from "../../types/database";

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface CreateCodingRequest {
  exam_id: string;
  question_text: string;
  starter_code?: string;
  expected_output?: string;
  marks: number;
  language: string;
  test_cases?: TestCase[];
}

export interface UpdateCodingRequest extends Partial<CreateCodingRequest> {
  id: string;
}

export interface GetCodingOptions {
  page?: number;
  limit?: number;
  search?: string;
  exam_id?: string;
  language?: string;
}

export interface GetCodingResponse {
  data: CodingQuestionWithTestCases[];
  count: number;
}

export interface CodingQuestionWithTestCases extends CodingQuestion {
  test_cases?: TestCase[];
}

export interface BulkCodingOperation {
  action: "delete" | "reorder" | "update_marks" | "update_language";
  question_ids: string[];
  data?: any;
}

export interface ImportCodingData {
  question_text: string;
  starter_code?: string;
  expected_output?: string;
  marks: number;
  language: string;
  test_cases?: TestCase[];
}

export interface ExportCodingData extends ImportCodingData {
  id: string;
}

export interface CodingTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  starter_code: string;
  example_question: string;
  example_test_cases: TestCase[];
}

// Supported programming languages
export const SUPPORTED_LANGUAGES = [
  { id: "javascript", name: "JavaScript", judge0_id: 63 },
  { id: "python", name: "Python 3", judge0_id: 71 },
  { id: "java", name: "Java", judge0_id: 62 },
  { id: "cpp", name: "C++", judge0_id: 54 },
  { id: "c", name: "C", judge0_id: 50 },
  { id: "csharp", name: "C#", judge0_id: 51 },
  { id: "go", name: "Go", judge0_id: 60 },
  { id: "rust", name: "Rust", judge0_id: 73 },
  { id: "typescript", name: "TypeScript", judge0_id: 74 },
] as const;

/**
 * Coding Question service for managing programming challenges
 * Accessible by teachers and admins
 */
export class CodingService {
  /**
   * Validate coding question data
   */
  private static validateCodingData(data: CreateCodingRequest): void {
    if (!data.question_text?.trim()) {
      throw new SupabaseError("Question text is required", "VALIDATION_ERROR");
    }

    if (data.question_text.length > 5000) {
      throw new SupabaseError(
        "Question text must be less than 5000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.starter_code && data.starter_code.length > 10000) {
      throw new SupabaseError(
        "Starter code must be less than 10000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (data.expected_output && data.expected_output.length > 5000) {
      throw new SupabaseError(
        "Expected output must be less than 5000 characters",
        "VALIDATION_ERROR"
      );
    }

    if (!data.marks || data.marks < 0.5 || data.marks > 100) {
      throw new SupabaseError(
        "Marks must be between 0.5 and 100",
        "VALIDATION_ERROR"
      );
    }

    if (!data.language?.trim()) {
      throw new SupabaseError(
        "Programming language is required",
        "VALIDATION_ERROR"
      );
    }

    const supportedLanguageIds = SUPPORTED_LANGUAGES.map((lang) => lang.id);
    if (!supportedLanguageIds.includes(data.language)) {
      throw new SupabaseError(
        `Unsupported language. Supported languages: ${supportedLanguageIds.join(
          ", "
        )}`,
        "VALIDATION_ERROR"
      );
    }

    if (!data.exam_id?.trim()) {
      throw new SupabaseError("Exam ID is required", "VALIDATION_ERROR");
    }

    // Validate test cases if provided
    if (data.test_cases) {
      if (data.test_cases.length > 20) {
        throw new SupabaseError(
          "Maximum 20 test cases are allowed",
          "VALIDATION_ERROR"
        );
      }

      data.test_cases.forEach((testCase, index) => {
        if (!testCase.input && testCase.input !== "") {
          throw new SupabaseError(
            `Test case ${index + 1}: Input is required`,
            "VALIDATION_ERROR"
          );
        }

        if (!testCase.expected_output && testCase.expected_output !== "") {
          throw new SupabaseError(
            `Test case ${index + 1}: Expected output is required`,
            "VALIDATION_ERROR"
          );
        }

        if (testCase.input.length > 1000) {
          throw new SupabaseError(
            `Test case ${index + 1}: Input must be less than 1000 characters`,
            "VALIDATION_ERROR"
          );
        }

        if (testCase.expected_output.length > 1000) {
          throw new SupabaseError(
            `Test case ${
              index + 1
            }: Expected output must be less than 1000 characters`,
            "VALIDATION_ERROR"
          );
        }

        if (typeof testCase.is_hidden !== "boolean") {
          throw new SupabaseError(
            `Test case ${index + 1}: is_hidden must be a boolean`,
            "VALIDATION_ERROR"
          );
        }
      });

      // Ensure at least one visible test case
      const visibleTestCases = data.test_cases.filter((tc) => !tc.is_hidden);
      if (visibleTestCases.length === 0) {
        throw new SupabaseError(
          "At least one test case must be visible to students",
          "VALIDATION_ERROR"
        );
      }
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
   * Create a new coding question
   */
  static async createCoding(
    userId: string,
    codingData: CreateCodingRequest
  ): Promise<CodingQuestionWithTestCases> {
    try {
      // Validate coding data
      this.validateCodingData(codingData);

      // Verify user has access to exam
      await this.verifyExamAccess(userId, codingData.exam_id);

      // Prepare coding data
      const newCodingData = {
        exam_id: codingData.exam_id,
        question_text: codingData.question_text.trim(),
        starter_code: codingData.starter_code?.trim() || null,
        expected_output: codingData.expected_output?.trim() || null,
        marks: codingData.marks,
        language: codingData.language,
        user_id: null, // Template question, not user answer
      };

      // Insert coding question
      const { data: coding, error } = await supabase
        .from("coding")
        .insert(newCodingData)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "CODING_CREATE_ERROR");
      }

      // Store test cases separately if provided
      let testCases: TestCase[] = [];
      if (codingData.test_cases && codingData.test_cases.length > 0) {
        testCases = await this.saveTestCases(coding.id, codingData.test_cases);
      }

      return {
        ...coding,
        test_cases: testCases,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create coding question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Save test cases for a coding question
   * For now, we'll store them as JSON in a separate field or table
   * This is a placeholder implementation - in production you might want a separate table
   */
  private static async saveTestCases(
    codingId: string,
    testCases: TestCase[]
  ): Promise<TestCase[]> {
    // For now, we'll store test cases as JSON in the database
    // In a production system, you might want a separate test_cases table

    // Since the current schema doesn't have a test_cases field, we'll simulate storage
    // In a real implementation, you would either:
    // 1. Add a test_cases JSONB field to the coding table
    // 2. Create a separate test_cases table with foreign key to coding questions

    // For this implementation, we'll return the test cases as-is
    // and handle storage in a future database migration
    return testCases;
  }

  /**
   * Get test cases for a coding question
   */
  private static async getTestCases(codingId: string): Promise<TestCase[]> {
    // Placeholder implementation
    // In a real system, this would fetch from database
    return [];
  } /**
   
* Get paginated list of coding questions
   */
  static async getCodings(
    userId: string,
    options: GetCodingOptions = {}
  ): Promise<GetCodingResponse> {
    try {
      const { page = 1, limit = 10, search, exam_id, language } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("coding")
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

      // Apply language filter
      if (language) {
        query = query.eq("language", language);
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: codings, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "CODING_FETCH_ERROR");
      }

      // Fetch test cases for each coding question
      const codingsWithTestCases = await Promise.all(
        (codings || []).map(async (coding) => ({
          ...coding,
          test_cases: await this.getTestCases(coding.id),
        }))
      );

      return {
        data: codingsWithTestCases,
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch coding questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get coding question by ID
   */
  static async getCodingById(
    userId: string,
    codingId: string
  ): Promise<CodingQuestionWithTestCases | null> {
    try {
      const { data: coding, error } = await supabase
        .from("coding")
        .select(
          `
          *,
          exams!inner(created_by)
        `
        )
        .eq("id", codingId)
        .is("user_id", null)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Coding question not found
        }
        throw new SupabaseError(error.message, "CODING_FETCH_ERROR");
      }

      // Check if user owns the exam
      if ((coding as any).exams.created_by !== userId) {
        throw new SupabaseError(
          "Coding question not found or access denied",
          "CODING_ACCESS_DENIED"
        );
      }

      // Remove the joined exam data
      const { exams, ...codingData } = coding as any;

      // Fetch test cases
      const testCases = await this.getTestCases(codingId);

      return {
        ...codingData,
        test_cases: testCases,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch coding question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Update coding question
   */
  static async updateCoding(
    userId: string,
    updateData: UpdateCodingRequest
  ): Promise<CodingQuestionWithTestCases> {
    try {
      const { id, test_cases, ...codingData } = updateData;

      // Get existing coding question to verify ownership
      const existingCoding = await this.getCodingById(userId, id);
      if (!existingCoding) {
        throw new SupabaseError(
          "Coding question not found or access denied",
          "CODING_NOT_FOUND"
        );
      }

      // Validate updates if they include coding data
      if (
        codingData.question_text ||
        codingData.starter_code !== undefined ||
        codingData.expected_output !== undefined ||
        codingData.marks ||
        codingData.language
      ) {
        const validationData = {
          exam_id: codingData.exam_id || existingCoding.exam_id,
          question_text:
            codingData.question_text || existingCoding.question_text,
          starter_code:
            codingData.starter_code !== undefined
              ? codingData.starter_code
              : existingCoding.starter_code,
          expected_output:
            codingData.expected_output !== undefined
              ? codingData.expected_output
              : existingCoding.expected_output,
          marks: codingData.marks || existingCoding.marks!,
          language: codingData.language || existingCoding.language!,
          test_cases: test_cases || existingCoding.test_cases,
        };

        this.validateCodingData(validationData);
      }

      // Prepare update data
      const updatePayload = {
        ...codingData,
        question_text: codingData.question_text?.trim(),
        starter_code: codingData.starter_code?.trim(),
        expected_output: codingData.expected_output?.trim(),
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
          delete updatePayload[key as keyof typeof updatePayload];
        }
      });

      // Update coding question
      const { data: coding, error } = await supabase
        .from("coding")
        .update(updatePayload)
        .eq("id", id)
        .is("user_id", null)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "CODING_UPDATE_ERROR");
      }

      // Update test cases if provided
      let updatedTestCases = existingCoding.test_cases || [];
      if (test_cases) {
        updatedTestCases = await this.saveTestCases(id, test_cases);
      }

      return {
        ...coding,
        test_cases: updatedTestCases,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to update coding question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Delete coding question
   */
  static async deleteCoding(userId: string, codingId: string): Promise<void> {
    try {
      // Verify ownership
      const coding = await this.getCodingById(userId, codingId);
      if (!coding) {
        throw new SupabaseError(
          "Coding question not found or access denied",
          "CODING_NOT_FOUND"
        );
      }

      // Check if exam is published
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("is_published")
        .eq("id", coding.exam_id)
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

      // Delete coding question
      const { error } = await supabase
        .from("coding")
        .delete()
        .eq("id", codingId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "CODING_DELETE_ERROR");
      }

      // Note: Test cases would be deleted via cascade if stored in separate table
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to delete coding question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Bulk operations on coding questions
   */
  static async bulkCodingOperation(
    userId: string,
    operation: BulkCodingOperation
  ): Promise<void> {
    try {
      const { action, question_ids, data } = operation;

      if (!question_ids || question_ids.length === 0) {
        throw new SupabaseError("No questions selected", "VALIDATION_ERROR");
      }

      // Verify ownership of all questions
      const { data: codings, error: fetchError } = await supabase
        .from("coding")
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
        throw new SupabaseError(fetchError.message, "CODING_FETCH_ERROR");
      }

      if (!codings || codings.length !== question_ids.length) {
        throw new SupabaseError(
          "Some questions not found or access denied",
          "CODING_ACCESS_DENIED"
        );
      }

      // Check ownership and published status
      for (const coding of codings) {
        if ((coding as any).exams.created_by !== userId) {
          throw new SupabaseError(
            "Access denied to some questions",
            "CODING_ACCESS_DENIED"
          );
        }
        if ((coding as any).exams.is_published && action !== "reorder") {
          throw new SupabaseError(
            "Cannot modify questions in published exam",
            "PUBLISHED_EXAM_ERROR"
          );
        }
      }

      switch (action) {
        case "delete":
          await this.bulkDeleteCodings(question_ids);
          break;
        case "reorder":
          await this.reorderCodings(question_ids, data?.order || []);
          break;
        case "update_marks":
          await this.bulkUpdateMarks(question_ids, data?.marks);
          break;
        case "update_language":
          await this.bulkUpdateLanguage(question_ids, data?.language);
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
   * Bulk delete coding questions
   */
  private static async bulkDeleteCodings(questionIds: string[]): Promise<void> {
    const { error } = await supabase
      .from("coding")
      .delete()
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_DELETE_ERROR");
    }
  }

  /**
   * Reorder coding questions (placeholder - would need additional order field in DB)
   */
  private static async reorderCodings(
    questionIds: string[],
    order: number[]
  ): Promise<void> {
    if (order.length !== questionIds.length) {
      throw new SupabaseError(
        "Order array must match question count",
        "VALIDATION_ERROR"
      );
    }

    // Placeholder implementation
    console.log(
      "Reorder operation requested but not implemented - requires order field in database"
    );
  }

  /**
   * Bulk update marks for coding questions
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
      .from("coding")
      .update({ marks })
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_UPDATE_ERROR");
    }
  }

  /**
   * Bulk update language for coding questions
   */
  private static async bulkUpdateLanguage(
    questionIds: string[],
    language: string
  ): Promise<void> {
    const supportedLanguageIds = SUPPORTED_LANGUAGES.map((lang) => lang.id);
    if (!supportedLanguageIds.includes(language)) {
      throw new SupabaseError(
        `Unsupported language. Supported languages: ${supportedLanguageIds.join(
          ", "
        )}`,
        "VALIDATION_ERROR"
      );
    }

    const { error } = await supabase
      .from("coding")
      .update({ language })
      .in("id", questionIds)
      .is("user_id", null);

    if (error) {
      throw new SupabaseError(error.message, "BULK_UPDATE_ERROR");
    }
  }

  /**
   * Import coding questions from data array
   */
  static async importCodings(
    userId: string,
    examId: string,
    codingData: ImportCodingData[]
  ): Promise<CodingQuestionWithTestCases[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      if (!codingData || codingData.length === 0) {
        throw new SupabaseError("No coding data provided", "VALIDATION_ERROR");
      }

      if (codingData.length > 50) {
        throw new SupabaseError(
          "Cannot import more than 50 questions at once",
          "VALIDATION_ERROR"
        );
      }

      // Validate all coding data
      const validatedData = codingData.map((coding, index) => {
        try {
          const codingWithExamId = { ...coding, exam_id: examId };
          this.validateCodingData(codingWithExamId);
          return {
            exam_id: examId,
            question_text: coding.question_text.trim(),
            starter_code: coding.starter_code?.trim() || null,
            expected_output: coding.expected_output?.trim() || null,
            marks: coding.marks,
            language: coding.language,
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

      // Insert all coding questions
      const { data: importedCodings, error } = await supabase
        .from("coding")
        .insert(validatedData)
        .select();

      if (error) {
        throw new SupabaseError(error.message, "CODING_IMPORT_ERROR");
      }

      // Save test cases for each imported question
      const codingsWithTestCases = await Promise.all(
        (importedCodings || []).map(async (coding, index) => {
          const originalData = codingData[index];
          let testCases: TestCase[] = [];

          if (originalData.test_cases && originalData.test_cases.length > 0) {
            testCases = await this.saveTestCases(
              coding.id,
              originalData.test_cases
            );
          }

          return {
            ...coding,
            test_cases: testCases,
          };
        })
      );

      return codingsWithTestCases;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to import coding questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Export coding questions for an exam
   */
  static async exportCodings(
    userId: string,
    examId: string
  ): Promise<ExportCodingData[]> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: codings, error } = await supabase
        .from("coding")
        .select(
          "id, question_text, starter_code, expected_output, marks, language"
        )
        .eq("exam_id", examId)
        .is("user_id", null)
        .order("created_at", { ascending: true });

      if (error) {
        throw new SupabaseError(error.message, "CODING_EXPORT_ERROR");
      }

      // Fetch test cases for each coding question
      const codingsWithTestCases = await Promise.all(
        (codings || []).map(async (coding) => ({
          ...coding,
          test_cases: await this.getTestCases(coding.id),
        }))
      );

      return codingsWithTestCases;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to export coding questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get coding questions for question bank (reusable questions)
   */
  static async getQuestionBank(
    userId: string,
    options: { search?: string; language?: string; limit?: number } = {}
  ): Promise<CodingQuestionWithTestCases[]> {
    try {
      const { search, language, limit = 50 } = options;

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
        .from("coding")
        .select("*")
        .in("exam_id", examIds)
        .is("user_id", null);

      // Apply search filter
      if (search) {
        query = query.ilike("question_text", `%${search}%`);
      }

      // Apply language filter
      if (language) {
        query = query.eq("language", language);
      }

      // Apply limit and ordering
      query = query.limit(limit).order("created_at", { ascending: false });

      const { data: codings, error } = await query;

      if (error) {
        throw new SupabaseError(error.message, "QUESTION_BANK_ERROR");
      }

      // Fetch test cases for each coding question
      const codingsWithTestCases = await Promise.all(
        (codings || []).map(async (coding) => ({
          ...coding,
          test_cases: await this.getTestCases(coding.id),
        }))
      );

      return codingsWithTestCases;
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
   * Copy coding question to another exam
   */
  static async copyCodingToExam(
    userId: string,
    codingId: string,
    targetExamId: string
  ): Promise<CodingQuestionWithTestCases> {
    try {
      // Get source coding question
      const sourceCoding = await this.getCodingById(userId, codingId);
      if (!sourceCoding) {
        throw new SupabaseError(
          "Source coding question not found or access denied",
          "CODING_NOT_FOUND"
        );
      }

      // Verify access to target exam
      await this.verifyExamAccess(userId, targetExamId);

      // Create new coding question in target exam
      const newCodingData: CreateCodingRequest = {
        exam_id: targetExamId,
        question_text: sourceCoding.question_text,
        starter_code: sourceCoding.starter_code,
        expected_output: sourceCoding.expected_output,
        marks: sourceCoding.marks!,
        language: sourceCoding.language!,
        test_cases: sourceCoding.test_cases,
      };

      return await this.createCoding(userId, newCodingData);
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to copy coding question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get coding statistics for an exam
   */
  static async getCodingStats(
    userId: string,
    examId: string
  ): Promise<{
    total: number;
    totalMarks: number;
    averageMarks: number;
    languageDistribution: { [key: string]: number };
    testCaseStats: {
      totalTestCases: number;
      averageTestCasesPerQuestion: number;
      visibleTestCases: number;
      hiddenTestCases: number;
    };
  }> {
    try {
      // Verify user has access to exam
      await this.verifyExamAccess(userId, examId);

      const { data: codings, error } = await supabase
        .from("coding")
        .select("marks, language")
        .eq("exam_id", examId)
        .is("user_id", null);

      if (error) {
        throw new SupabaseError(error.message, "CODING_STATS_ERROR");
      }

      const total = codings?.length || 0;
      const totalMarks =
        codings?.reduce((sum, coding) => sum + (coding.marks || 0), 0) || 0;
      const averageMarks = total > 0 ? totalMarks / total : 0;

      // Calculate language distribution
      const languageDistribution: { [key: string]: number } = {};
      codings?.forEach((coding) => {
        const lang = coding.language || "unknown";
        languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
      });

      // Calculate test case statistics
      // For now, we'll return placeholder values since test cases aren't fully implemented
      const testCaseStats = {
        totalTestCases: 0,
        averageTestCasesPerQuestion: 0,
        visibleTestCases: 0,
        hiddenTestCases: 0,
      };

      return {
        total,
        totalMarks,
        averageMarks: Math.round(averageMarks * 100) / 100,
        languageDistribution,
        testCaseStats,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get coding statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get predefined coding templates
   */
  static getCodingTemplates(): CodingTemplate[] {
    return [
      {
        id: "hello-world-js",
        name: "Hello World - JavaScript",
        description: "Basic JavaScript function template",
        language: "javascript",
        starter_code: `function solution() {
    // Write your code here
    return "Hello, World!";
}

// Do not modify below this line
console.log(solution());`,
        example_question: "Write a function that returns 'Hello, World!'",
        example_test_cases: [
          {
            input: "",
            expected_output: "Hello, World!",
            is_hidden: false,
          },
        ],
      },
      {
        id: "hello-world-python",
        name: "Hello World - Python",
        description: "Basic Python function template",
        language: "python",
        starter_code: `def solution():
    # Write your code here
    return "Hello, World!"

# Do not modify below this line
print(solution())`,
        example_question: "Write a function that returns 'Hello, World!'",
        example_test_cases: [
          {
            input: "",
            expected_output: "Hello, World!",
            is_hidden: false,
          },
        ],
      },
      {
        id: "sum-two-numbers-java",
        name: "Sum Two Numbers - Java",
        description: "Basic Java method template for arithmetic operations",
        language: "java",
        starter_code: `public class Solution {
    public static int sum(int a, int b) {
        // Write your code here
        return a + b;
    }
    
    public static void main(String[] args) {
        System.out.println(sum(5, 3));
    }
}`,
        example_question: "Write a method that returns the sum of two integers",
        example_test_cases: [
          {
            input: "5 3",
            expected_output: "8",
            is_hidden: false,
          },
          {
            input: "10 -5",
            expected_output: "5",
            is_hidden: true,
          },
        ],
      },
      {
        id: "array-processing-cpp",
        name: "Array Processing - C++",
        description: "Template for array manipulation problems",
        language: "cpp",
        starter_code: `#include <iostream>
#include <vector>
using namespace std;

int findMax(vector<int>& arr) {
    // Write your code here
    int maxVal = arr[0];
    for (int i = 1; i < arr.size(); i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    return maxVal;
}

int main() {
    vector<int> arr = {1, 5, 3, 9, 2};
    cout << findMax(arr) << endl;
    return 0;
}`,
        example_question:
          "Write a function to find the maximum element in an array",
        example_test_cases: [
          {
            input: "1 5 3 9 2",
            expected_output: "9",
            is_hidden: false,
          },
          {
            input: "-1 -5 -3 -2",
            expected_output: "-1",
            is_hidden: true,
          },
        ],
      },
      {
        id: "string-manipulation-python",
        name: "String Manipulation - Python",
        description: "Template for string processing problems",
        language: "python",
        starter_code: `def reverse_string(s):
    # Write your code here
    return s[::-1]

# Do not modify below this line
test_string = "hello"
print(reverse_string(test_string))`,
        example_question: "Write a function to reverse a string",
        example_test_cases: [
          {
            input: "hello",
            expected_output: "olleh",
            is_hidden: false,
          },
          {
            input: "world",
            expected_output: "dlrow",
            is_hidden: true,
          },
        ],
      },
    ];
  }

  /**
   * Get language-specific starter code template
   */
  static getLanguageTemplate(language: string): string {
    const templates: { [key: string]: string } = {
      javascript: `function solution() {
    // Write your code here
    
}

// Do not modify below this line
console.log(solution());`,
      python: `def solution():
    # Write your code here
    pass

# Do not modify below this line
print(solution())`,
      java: `public class Solution {
    public static void main(String[] args) {
        // Write your code here
        
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    
    return 0;
}`,
      c: `#include <stdio.h>

int main() {
    // Write your code here
    
    return 0;
}`,
      csharp: `using System;

class Program {
    static void Main() {
        // Write your code here
        
    }
}`,
      go: `package main

import "fmt"

func main() {
    // Write your code here
    
}`,
      rust: `fn main() {
    // Write your code here
    
}`,
      typescript: `function solution(): any {
    // Write your code here
    
}

// Do not modify below this line
console.log(solution());`,
    };

    return templates[language] || `// Write your code here for ${language}`;
  }
}
