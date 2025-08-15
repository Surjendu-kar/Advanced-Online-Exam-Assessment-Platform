import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import {
  SAQService,
  CreateSAQRequest,
} from "../../../../lib/services/saqService";
import { supabase } from "../../../../lib/supabaseClient";

// Mock the supabase client
vi.mock("../../../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
  SupabaseError: class SupabaseError extends Error {
    constructor(
      message: string,
      public code: string,
      public originalError?: any
    ) {
      super(message);
      this.name = "SupabaseError";
    }
  },
}));

describe("SAQService", () => {
  const mockUserId = "user-123";
  const mockExamId = "exam-123";
  const mockSAQId = "saq-123";

  const mockSAQData: CreateSAQRequest = {
    exam_id: mockExamId,
    question_text: "Explain the concept of photosynthesis.",
    correct_answer:
      "Photosynthesis is the process by which plants convert light energy into chemical energy.",
    answer_guidelines:
      "Students should explain the process and mention chlorophyll.",
    marking_criteria: "Full marks for complete explanation with key terms.",
    marks: 5,
  };

  const mockSAQResponse = {
    id: mockSAQId,
    ...mockSAQData,
    user_id: null,
    created_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSAQ", () => {
    it("should create a new SAQ question successfully", async () => {
      // Mock exam access verification
      (supabase.from as Mock).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockExamId, created_by: mockUserId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock SAQ creation
      (supabase.from as Mock).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSAQResponse,
              error: null,
            }),
          }),
        }),
      });

      const result = await SAQService.createSAQ(mockUserId, mockSAQData);

      expect(result).toEqual(mockSAQResponse);
      expect(supabase.from).toHaveBeenCalledWith("exams");
      expect(supabase.from).toHaveBeenCalledWith("saq");
    });

    it("should throw error for invalid question text", async () => {
      const invalidData = { ...mockSAQData, question_text: "" };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Question text is required");
    });

    it("should throw error for question text too long", async () => {
      const invalidData = { ...mockSAQData, question_text: "a".repeat(5001) };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Question text must be less than 5000 characters");
    });

    it("should throw error for invalid marks", async () => {
      const invalidData = { ...mockSAQData, marks: 0 };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Marks must be between 0.5 and 100");
    });

    it("should throw error for marks too high", async () => {
      const invalidData = { ...mockSAQData, marks: 101 };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Marks must be between 0.5 and 100");
    });

    it("should throw error when exam access is denied", async () => {
      (supabase.from as Mock).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      });

      await expect(
        SAQService.createSAQ(mockUserId, mockSAQData)
      ).rejects.toThrow("Exam not found or access denied");
    });
  });

  describe("validation", () => {
    it("should validate correct answer length", async () => {
      const invalidData = { ...mockSAQData, correct_answer: "a".repeat(2001) };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Correct answer must be less than 2000 characters");
    });

    it("should validate answer guidelines length", async () => {
      const invalidData = {
        ...mockSAQData,
        answer_guidelines: "a".repeat(1001),
      };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Answer guidelines must be less than 1000 characters");
    });

    it("should validate marking criteria length", async () => {
      const invalidData = {
        ...mockSAQData,
        marking_criteria: "a".repeat(1001),
      };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Marking criteria must be less than 1000 characters");
    });

    it("should validate exam_id is provided", async () => {
      const invalidData = { ...mockSAQData, exam_id: "" };

      await expect(
        SAQService.createSAQ(mockUserId, invalidData)
      ).rejects.toThrow("Exam ID is required");
    });
  });

  describe("getTemplates", () => {
    it("should return predefined templates", () => {
      const templates = SAQService.getTemplates();

      expect(templates).toHaveLength(6);
      expect(templates[0]).toHaveProperty("id", "explain-concept");
      expect(templates[0]).toHaveProperty("name", "Explain a Concept");
      expect(templates[0]).toHaveProperty("category", "conceptual");
      expect(templates[0]).toHaveProperty("suggested_marks", 5);
    });

    it("should have all required template properties", () => {
      const templates = SAQService.getTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("question_text");
        expect(template).toHaveProperty("suggested_marks");
        expect(template).toHaveProperty("category");
      });
    });

    it("should have different categories", () => {
      const templates = SAQService.getTemplates();
      const categories = templates.map((t) => t.category);
      const uniqueCategories = [...new Set(categories)];

      expect(uniqueCategories.length).toBeGreaterThan(1);
      expect(uniqueCategories).toContain("conceptual");
      expect(uniqueCategories).toContain("analytical");
    });
  });

  describe("createFromTemplate", () => {
    it("should create SAQ from template successfully", async () => {
      // Mock exam access verification
      (supabase.from as Mock).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockExamId, created_by: mockUserId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock SAQ creation
      const templateSAQ = {
        id: mockSAQId,
        exam_id: mockExamId,
        question_text:
          "Explain the concept of [CONCEPT] and provide an example.",
        answer_guidelines:
          "Students should define the concept clearly, explain its key characteristics, and provide a relevant example.",
        marking_criteria:
          "Full marks: Clear definition + explanation + relevant example. Partial marks: Missing one component.",
        marks: 5,
        user_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      (supabase.from as Mock).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: templateSAQ,
              error: null,
            }),
          }),
        }),
      });

      const result = await SAQService.createFromTemplate(
        mockUserId,
        mockExamId,
        "explain-concept"
      );

      expect(result).toEqual(templateSAQ);
    });

    it("should throw error for invalid template", async () => {
      await expect(
        SAQService.createFromTemplate(
          mockUserId,
          mockExamId,
          "invalid-template"
        )
      ).rejects.toThrow("Template not found");
    });

    it("should apply customizations to template", async () => {
      // Mock exam access verification
      (supabase.from as Mock).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockExamId, created_by: mockUserId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock SAQ creation
      const customizedSAQ = {
        id: mockSAQId,
        exam_id: mockExamId,
        question_text: "Custom question text",
        answer_guidelines:
          "Students should define the concept clearly, explain its key characteristics, and provide a relevant example.",
        marking_criteria:
          "Full marks: Clear definition + explanation + relevant example. Partial marks: Missing one component.",
        marks: 10,
        user_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      (supabase.from as Mock).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: customizedSAQ,
              error: null,
            }),
          }),
        }),
      });

      const result = await SAQService.createFromTemplate(
        mockUserId,
        mockExamId,
        "explain-concept",
        {
          question_text: "Custom question text",
          marks: 10,
        }
      );

      expect(result.question_text).toBe("Custom question text");
      expect(result.marks).toBe(10);
    });
  });
});
