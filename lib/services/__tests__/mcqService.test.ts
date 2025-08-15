import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MCQService,
  CreateMCQRequest,
  UpdateMCQRequest,
  BulkMCQOperation,
  ImportMCQData,
} from "../mcqService";
import { supabase } from "../../supabaseClient";

// Mock Supabase client
vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
  SupabaseError: class SupabaseError extends Error {
    constructor(message: string, public code?: string, public details?: any) {
      super(message);
      this.name = "SupabaseError";
    }
  },
}));

describe("MCQService", () => {
  const mockUserId = "user-123";
  const mockExamId = "exam-123";
  const mockMCQId = "mcq-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMCQ", () => {
    const validMCQData: CreateMCQRequest = {
      exam_id: mockExamId,
      question_text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct_option: 1,
      marks: 2,
    };

    it("should create a new MCQ with valid data", async () => {
      const mockCreatedMCQ = {
        id: mockMCQId,
        ...validMCQData,
        user_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock MCQ insertion
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCreatedMCQ,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return { insert: mockInsert };
        }
      });

      const result = await MCQService.createMCQ(mockUserId, validMCQData);

      expect(result).toEqual(mockCreatedMCQ);
      expect(mockInsert).toHaveBeenCalledWith({
        exam_id: mockExamId,
        question_text: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correct_option: 1,
        marks: 2,
        user_id: null,
      });
    });

    it("should throw validation error for empty question text", async () => {
      const invalidData = { ...validMCQData, question_text: "" };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Question text is required");
    });

    it("should throw validation error for too few options", async () => {
      const invalidData = { ...validMCQData, options: ["Only one option"] };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("At least 2 options are required");
    });

    it("should throw validation error for too many options", async () => {
      const invalidData = {
        ...validMCQData,
        options: ["1", "2", "3", "4", "5", "6", "7"], // 7 options
      };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Maximum 6 options are allowed");
    });

    it("should throw validation error for empty option", async () => {
      const invalidData = {
        ...validMCQData,
        options: ["Valid", "", "Also valid"],
      };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Option 2 cannot be empty");
    });

    it("should throw validation error for duplicate options", async () => {
      const invalidData = {
        ...validMCQData,
        options: ["Same", "Same", "Different"],
      };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Options must be unique");
    });

    it("should throw validation error for invalid correct option", async () => {
      const invalidData = { ...validMCQData, correct_option: 5 }; // Index out of bounds

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Valid correct option index is required");
    });

    it("should throw validation error for invalid marks", async () => {
      const invalidData = { ...validMCQData, marks: 0 };

      await expect(
        MCQService.createMCQ(mockUserId, invalidData)
      ).rejects.toThrow("Marks must be between 0.5 and 100");
    });

    it("should throw access denied error for unauthorized exam", async () => {
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      (supabase.from as any).mockReturnValue(mockExamQuery);

      await expect(
        MCQService.createMCQ(mockUserId, validMCQData)
      ).rejects.toThrow("Exam not found or access denied");
    });
  });

  describe("getMCQs", () => {
    it("should fetch paginated MCQs for a specific exam", async () => {
      const mockMCQs = [
        {
          id: "mcq-1",
          exam_id: mockExamId,
          question_text: "Question 1",
          options: ["A", "B", "C"],
          correct_option: 0,
          marks: 2,
        },
        {
          id: "mcq-2",
          exam_id: mockExamId,
          question_text: "Question 2",
          options: ["X", "Y", "Z"],
          correct_option: 1,
          marks: 3,
        },
      ];

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock MCQ query
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      const result = await MCQService.getMCQs(mockUserId, {
        exam_id: mockExamId,
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockMCQs);
      expect(result.count).toBe(2);
      expect(mockMCQQuery.eq).toHaveBeenCalledWith("exam_id", mockExamId);
    });

    it("should apply search filter", async () => {
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      // Mock user exams query
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: mockExamId }],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      await MCQService.getMCQs(mockUserId, {
        search: "test question",
      });

      expect(mockMCQQuery.ilike).toHaveBeenCalledWith(
        "question_text",
        "%test question%"
      );
    });

    it("should return empty result when user has no exams", async () => {
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        // Should not reach MCQ query when no exams exist
        return {};
      });

      const result = await MCQService.getMCQs(mockUserId);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe("getMCQById", () => {
    it("should fetch MCQ by ID for owner", async () => {
      const mockMCQ = {
        id: mockMCQId,
        exam_id: mockExamId,
        question_text: "Test question",
        options: ["A", "B", "C"],
        correct_option: 1,
        marks: 2,
        exams: { created_by: mockUserId },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMCQ,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await MCQService.getMCQById(mockUserId, mockMCQId);

      expect(result).toEqual({
        id: mockMCQId,
        exam_id: mockExamId,
        question_text: "Test question",
        options: ["A", "B", "C"],
        correct_option: 1,
        marks: 2,
      });
    });

    it("should return null for non-existent MCQ", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await MCQService.getMCQById(mockUserId, mockMCQId);

      expect(result).toBeNull();
    });

    it("should throw access denied for unauthorized MCQ", async () => {
      const mockMCQ = {
        id: mockMCQId,
        exams: { created_by: "other-user" },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMCQ,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(
        MCQService.getMCQById(mockUserId, mockMCQId)
      ).rejects.toThrow("MCQ not found or access denied");
    });
  });

  describe("updateMCQ", () => {
    const mockExistingMCQ = {
      id: mockMCQId,
      exam_id: mockExamId,
      question_text: "Old question",
      options: ["A", "B", "C"],
      correct_option: 0,
      marks: 2,
    };

    it("should update MCQ with valid data", async () => {
      const updateData: UpdateMCQRequest = {
        id: mockMCQId,
        question_text: "Updated question",
        marks: 3,
      };

      const mockUpdatedMCQ = {
        ...mockExistingMCQ,
        question_text: "Updated question",
        marks: 3,
      };

      // Mock getMCQById
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockExistingMCQ, exams: { created_by: mockUserId } },
          error: null,
        }),
      };

      // Mock update
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedMCQ,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return {
            ...mockGetQuery,
            ...mockUpdateQuery,
          };
        }
        return {};
      });

      const result = await MCQService.updateMCQ(mockUserId, updateData);

      expect(result).toEqual(mockUpdatedMCQ);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        question_text: "Updated question",
        marks: 3,
      });
    });

    it("should validate updated data", async () => {
      const invalidUpdateData: UpdateMCQRequest = {
        id: mockMCQId,
        options: ["Only one"], // Invalid - too few options
      };

      // Mock getMCQById
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockExistingMCQ, exams: { created_by: mockUserId } },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockGetQuery);

      await expect(
        MCQService.updateMCQ(mockUserId, invalidUpdateData)
      ).rejects.toThrow("At least 2 options are required");
    });
  });

  describe("deleteMCQ", () => {
    it("should delete MCQ from unpublished exam", async () => {
      const mockMCQ = {
        id: mockMCQId,
        exam_id: mockExamId,
        exams: { created_by: mockUserId },
      };

      const mockExam = {
        is_published: false,
      };

      // Mock getMCQById
      const mockGetMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMCQ,
          error: null,
        }),
      };

      // Mock exam check
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
      };

      // Mock delete
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return {
            ...mockGetMCQQuery,
            ...mockDeleteQuery,
          };
        }
        if (table === "exams") {
          return mockExamQuery;
        }
      });

      await MCQService.deleteMCQ(mockUserId, mockMCQId);

      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith("id", mockMCQId);
    });

    it("should prevent deletion from published exam", async () => {
      const mockMCQ = {
        id: mockMCQId,
        exam_id: mockExamId,
        exams: { created_by: mockUserId },
      };

      const mockExam = {
        is_published: true,
      };

      // Mock getMCQById
      const mockGetMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMCQ,
          error: null,
        }),
      };

      // Mock exam check
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return mockGetMCQQuery;
        }
        if (table === "exams") {
          return mockExamQuery;
        }
      });

      await expect(MCQService.deleteMCQ(mockUserId, mockMCQId)).rejects.toThrow(
        "Cannot delete questions from published exam"
      );
    });
  });

  describe("bulkMCQOperation", () => {
    const mockQuestionIds = ["mcq-1", "mcq-2", "mcq-3"];

    it("should perform bulk delete operation", async () => {
      const operation: BulkMCQOperation = {
        action: "delete",
        question_ids: mockQuestionIds,
      };

      const mockMCQs = mockQuestionIds.map((id) => ({
        id,
        exam_id: mockExamId,
        exams: { created_by: mockUserId, is_published: false },
      }));

      // Mock ownership verification
      const mockVerifyQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
        }),
      };

      // Mock bulk delete
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return {
            ...mockVerifyQuery,
            ...mockDeleteQuery,
          };
        }
        return {};
      });

      await MCQService.bulkMCQOperation(mockUserId, operation);

      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.in).toHaveBeenCalledWith("id", mockQuestionIds);
    });

    it("should perform bulk update marks operation", async () => {
      const operation: BulkMCQOperation = {
        action: "update_marks",
        question_ids: mockQuestionIds,
        data: { marks: 5 },
      };

      const mockMCQs = mockQuestionIds.map((id) => ({
        id,
        exam_id: mockExamId,
        exams: { created_by: mockUserId, is_published: false },
      }));

      // Mock ownership verification
      const mockVerifyQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
        }),
      };

      // Mock bulk update
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return {
            ...mockVerifyQuery,
            ...mockUpdateQuery,
          };
        }
        return {};
      });

      await MCQService.bulkMCQOperation(mockUserId, operation);

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ marks: 5 });
      expect(mockUpdateQuery.in).toHaveBeenCalledWith("id", mockQuestionIds);
    });

    it("should prevent bulk operations on published exam questions", async () => {
      const operation: BulkMCQOperation = {
        action: "delete",
        question_ids: mockQuestionIds,
      };

      const mockMCQs = mockQuestionIds.map((id) => ({
        id,
        exam_id: mockExamId,
        exams: { created_by: mockUserId, is_published: true }, // Published exam
      }));

      const mockVerifyQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockVerifyQuery);

      await expect(
        MCQService.bulkMCQOperation(mockUserId, operation)
      ).rejects.toThrow("Cannot modify questions in published exam");
    });

    it("should throw error for invalid bulk operation", async () => {
      const operation: BulkMCQOperation = {
        action: "invalid_action" as any,
        question_ids: mockQuestionIds,
      };

      const mockMCQs = mockQuestionIds.map((id) => ({
        id,
        exam_id: mockExamId,
        exams: { created_by: mockUserId, is_published: false },
      }));

      const mockVerifyQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockVerifyQuery);

      await expect(
        MCQService.bulkMCQOperation(mockUserId, operation)
      ).rejects.toThrow("Invalid bulk operation");
    });

    it("should throw error when no questions selected", async () => {
      const operation: BulkMCQOperation = {
        action: "delete",
        question_ids: [],
      };

      await expect(
        MCQService.bulkMCQOperation(mockUserId, operation)
      ).rejects.toThrow("No questions selected");
    });
  });

  describe("importMCQs", () => {
    const mockImportData: ImportMCQData[] = [
      {
        question_text: "What is 1 + 1?",
        options: ["1", "2", "3"],
        correct_option: 1,
        marks: 2,
      },
      {
        question_text: "What is 2 + 2?",
        options: ["3", "4", "5"],
        correct_option: 1,
        marks: 2,
      },
    ];

    it("should import valid MCQ data", async () => {
      const mockImportedMCQs = mockImportData.map((data, index) => ({
        id: `imported-mcq-${index}`,
        exam_id: mockExamId,
        ...data,
        user_id: null,
        created_at: "2024-01-01T00:00:00Z",
      }));

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock bulk insert
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockImportedMCQs,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockInsertQuery;
        }
      });

      const result = await MCQService.importMCQs(
        mockUserId,
        mockExamId,
        mockImportData
      );

      expect(result).toEqual(mockImportedMCQs);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith([
        {
          exam_id: mockExamId,
          question_text: "What is 1 + 1?",
          options: ["1", "2", "3"],
          correct_option: 1,
          marks: 2,
          user_id: null,
        },
        {
          exam_id: mockExamId,
          question_text: "What is 2 + 2?",
          options: ["3", "4", "5"],
          correct_option: 1,
          marks: 2,
          user_id: null,
        },
      ]);
    });

    it("should throw error for empty import data", async () => {
      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockExamQuery);

      await expect(
        MCQService.importMCQs(mockUserId, mockExamId, [])
      ).rejects.toThrow("No MCQ data provided");
    });

    it("should throw error for too many questions", async () => {
      const tooManyQuestions = Array(101).fill(mockImportData[0]);

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockExamQuery);

      await expect(
        MCQService.importMCQs(mockUserId, mockExamId, tooManyQuestions)
      ).rejects.toThrow("Cannot import more than 100 questions at once");
    });

    it("should throw validation error for invalid question data", async () => {
      const invalidData: ImportMCQData[] = [
        {
          question_text: "", // Invalid - empty question
          options: ["A", "B"],
          correct_option: 0,
          marks: 2,
        },
      ];

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockExamQuery);

      await expect(
        MCQService.importMCQs(mockUserId, mockExamId, invalidData)
      ).rejects.toThrow("Validation error in question 1");
    });
  });

  describe("exportMCQs", () => {
    it("should export MCQs for an exam", async () => {
      const mockExportData = [
        {
          id: "mcq-1",
          question_text: "Question 1",
          options: ["A", "B", "C"],
          correct_option: 0,
          marks: 2,
        },
        {
          id: "mcq-2",
          question_text: "Question 2",
          options: ["X", "Y", "Z"],
          correct_option: 1,
          marks: 3,
        },
      ];

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock MCQ export query
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockExportData,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      const result = await MCQService.exportMCQs(mockUserId, mockExamId);

      expect(result).toEqual(mockExportData);
      expect(mockMCQQuery.eq).toHaveBeenCalledWith("exam_id", mockExamId);
      expect(mockMCQQuery.is).toHaveBeenCalledWith("user_id", null);
    });
  });

  describe("getQuestionBank", () => {
    it("should fetch question bank with search filter", async () => {
      const mockQuestions = [
        {
          id: "mcq-1",
          question_text: "Math question",
          options: ["A", "B"],
          correct_option: 0,
          marks: 2,
        },
      ];

      // Mock user exams query
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: mockExamId }],
          error: null,
        }),
      };

      // Mock question bank query
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockQuestions,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      const result = await MCQService.getQuestionBank(mockUserId, {
        search: "math",
        limit: 25,
      });

      expect(result).toEqual(mockQuestions);
      expect(mockMCQQuery.ilike).toHaveBeenCalledWith(
        "question_text",
        "%math%"
      );
      expect(mockMCQQuery.limit).toHaveBeenCalledWith(25);
    });

    it("should return empty array when user has no exams", async () => {
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockExamQuery);

      const result = await MCQService.getQuestionBank(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("copyMCQToExam", () => {
    it("should copy MCQ to another exam", async () => {
      const targetExamId = "target-exam-123";
      const sourceMCQ = {
        id: mockMCQId,
        exam_id: mockExamId,
        question_text: "Source question",
        options: ["A", "B", "C"],
        correct_option: 1,
        marks: 3,
        exams: { created_by: mockUserId },
      };

      const copiedMCQ = {
        id: "copied-mcq-123",
        exam_id: targetExamId,
        question_text: "Source question",
        options: ["A", "B", "C"],
        correct_option: 1,
        marks: 3,
        user_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      // Mock getMCQById
      const mockGetMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: sourceMCQ,
          error: null,
        }),
      };

      // Mock target exam access verification
      const mockTargetExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: targetExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock MCQ creation
      const mockCreateQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: copiedMCQ,
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "mcq") {
          return {
            ...mockGetMCQQuery,
            ...mockCreateQuery,
          };
        }
        if (table === "exams") {
          return mockTargetExamQuery;
        }
      });

      const result = await MCQService.copyMCQToExam(
        mockUserId,
        mockMCQId,
        targetExamId
      );

      expect(result).toEqual(copiedMCQ);
      expect(mockCreateQuery.insert).toHaveBeenCalledWith({
        exam_id: targetExamId,
        question_text: "Source question",
        options: ["A", "B", "C"],
        correct_option: 1,
        marks: 3,
        user_id: null,
      });
    });
  });

  describe("getMCQStats", () => {
    it("should calculate MCQ statistics for an exam", async () => {
      const mockMCQs = [
        {
          marks: 2,
          correct_option: 0,
          options: ["A", "B"],
        },
        {
          marks: 3,
          correct_option: 1,
          options: ["X", "Y", "Z"],
        },
        {
          marks: 5,
          correct_option: 2,
          options: ["P", "Q", "R", "S"],
        },
      ];

      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock MCQ stats query
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockMCQs,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      const result = await MCQService.getMCQStats(mockUserId, mockExamId);

      expect(result).toEqual({
        total: 3,
        totalMarks: 10, // 2 + 3 + 5
        averageMarks: 3.33, // 10 / 3, rounded to 2 decimal places
        optionDistribution: {
          2: 1, // One question with 2 options
          3: 1, // One question with 3 options
          4: 1, // One question with 4 options
        },
      });
    });

    it("should handle empty MCQ list", async () => {
      // Mock exam access verification
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockExamId, created_by: mockUserId },
          error: null,
        }),
      };

      // Mock empty MCQ query
      const mockMCQQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        if (table === "mcq") {
          return mockMCQQuery;
        }
      });

      const result = await MCQService.getMCQStats(mockUserId, mockExamId);

      expect(result).toEqual({
        total: 0,
        totalMarks: 0,
        averageMarks: 0,
        optionDistribution: {},
      });
    });
  });
});
