import { describe, it, expect, vi, beforeEach } from "vitest";
import { SAQExamService } from "../saqExamService";
import { supabase } from "../../supabaseClient";

// Mock Supabase client
vi.mock("../../supabaseClient", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    supabase: mockSupabase,
    SupabaseError: class extends Error {
      constructor(message: string, public code: string, public originalError?: any) {
        super(message);
        this.name = "SupabaseError";
      }
    },
  };
});

describe("SAQExamService", () => {
  const mockUserId = "user-123";
  const mockTeacherId = "teacher-123";
  const mockSessionId = "session-456";
  const mockExamId = "exam-789";
  const mockQuestionId = "question-000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitSAQAnswer", () => {
    it("should submit SAQ answer successfully", async () => {
      const mockSession = {
        id: mockSessionId,
        exam_id: mockExamId,
        status: "in_progress",
      };

      const mockTemplateQuestion = {
        id: mockQuestionId,
        exam_id: mockExamId,
        question_text: "Test question",
        marks: 5,
      };

      const mockUserSAQ = {
        id: "user-saq-123",
        exam_id: mockExamId,
        user_id: mockUserId,
        question_text: "Test question",
        answer_text: "Test answer",
        marks: 5,
      };

      // Mock session verification
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        } as any)
        // Mock exam time check - session
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { start_time: new Date().toISOString(), created_at: new Date().toISOString() }, error: null }),
        } as any)
        // Mock exam time check - exam
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { duration: 60 }, error: null }),
        } as any)
        // Mock question verification
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplateQuestion, error: null }),
        } as any)
        // Mock user SAQ record check
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any)
        // Mock answer update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any);

      const result = await SAQExamService.submitSAQAnswer(mockUserId, {
        session_id: mockSessionId,
        question_id: mockQuestionId,
        answer_text: "Test answer",
      });

      expect(result).toEqual(mockUserSAQ);
    });

    it("should create user SAQ record if it doesn't exist", async () => {
      const mockSession = {
        id: mockSessionId,
        exam_id: mockExamId,
        status: "in_progress",
      };

      const mockTemplateQuestion = {
        id: mockQuestionId,
        exam_id: mockExamId,
        question_text: "Test question",
        marks: 5,
      };

      const mockUserSAQ = {
        id: "user-saq-123",
        exam_id: mockExamId,
        user_id: mockUserId,
        question_text: "Test question",
        answer_text: "Test answer",
        marks: 5,
      };

      // Mock session verification
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        } as any)
        // Mock exam time check - session
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { start_time: new Date().toISOString(), created_at: new Date().toISOString() }, error: null }),
        } as any)
        // Mock exam time check - exam
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { duration: 60 }, error: null }),
        } as any)
        // Mock question verification
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplateQuestion, error: null }),
        } as any)
        // Mock user SAQ record check (not found)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        } as any)
        // Mock template question for user record creation
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplateQuestion, error: null }),
        } as any)
        // Mock user SAQ record creation
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any)
        // Mock answer update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any);

      const result = await SAQExamService.submitSAQAnswer(mockUserId, {
        session_id: mockSessionId,
        question_id: mockQuestionId,
        answer_text: "Test answer",
      });

      expect(result).toEqual(mockUserSAQ);
    });
  });

  describe("autoSaveSAQAnswer", () => {
    it("should auto-save SAQ answer successfully", async () => {
      const mockSession = {
        id: mockSessionId,
        exam_id: mockExamId,
        status: "in_progress",
      };

      const mockTemplateQuestion = {
        id: mockQuestionId,
        exam_id: mockExamId,
        question_text: "Test question",
        marks: 5,
      };

      const mockUserSAQ = {
        id: "user-saq-123",
        exam_id: mockExamId,
        user_id: mockUserId,
        question_text: "Test question",
        answer_text: "Draft answer",
        marks: 5,
      };

      // Mock session verification
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        } as any)
        // Mock exam time check - session
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { start_time: new Date().toISOString(), created_at: new Date().toISOString() }, error: null }),
        } as any)
        // Mock exam time check - exam
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { duration: 60 }, error: null }),
        } as any)
        // Mock question verification
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplateQuestion, error: null }),
        } as any)
        // Mock user SAQ record check
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any)
        // Mock draft save
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any);

      const result = await SAQExamService.autoSaveSAQAnswer(mockUserId, {
        session_id: mockSessionId,
        question_id: mockQuestionId,
        answer_text: "Draft answer",
      });

      expect(result).toEqual(mockUserSAQ);
    });
  });

  describe("getAnswerVersions", () => {
    it("should get answer versions successfully", async () => {
      const mockSession = {
        id: mockSessionId,
        exam_id: mockExamId,
        status: "in_progress",
      };

      const mockUserSAQ = {
        id: "user-saq-123",
        answer_text: "Test answer",
        created_at: new Date().toISOString(),
      };

      const expectedVersions = [
        {
          id: "user-saq-123",
          session_id: mockSessionId,
          question_id: mockQuestionId,
          answer_text: "Test answer",
          created_at: mockUserSAQ.created_at,
        },
      ];

      // Mock session verification
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        } as any)
        // Mock session exam_id fetch
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { exam_id: mockExamId }, error: null }),
        } as any)
        // Mock user SAQ record fetch
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any);

      const result = await SAQExamService.getAnswerVersions(
        mockUserId,
        mockSessionId,
        mockQuestionId
      );

      expect(result).toEqual(expectedVersions);
    });
  });

  describe("reviewSAQAnswer", () => {
    it("should review SAQ answer successfully", async () => {
      const mockSession = {
        exam_id: mockExamId,
        user_id: "student-123",
      };

      const mockExam = {
        created_by: mockTeacherId,
      };

      const mockUserSAQ = {
        id: "user-saq-123",
        exam_id: mockExamId,
        user_id: "student-123",
        question_text: "Test question",
        answer_text: "Student answer",
        marks: 5,
        marks_obtained: 4,
        grader_comments: "Good answer but could be more detailed",
      };

      // Mock session verification
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        } as any)
        // Mock exam verification
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockExam, error: null }),
        } as any)
        // Mock user SAQ record fetch
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any)
        // Mock answer update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUserSAQ, error: null }),
        } as any);

      const result = await SAQExamService.reviewSAQAnswer(mockTeacherId, {
        session_id: mockSessionId,
        question_id: mockQuestionId,
        marks_obtained: 4,
        grader_comments: "Good answer but could be more detailed",
      });

      expect(result).toEqual(mockUserSAQ);
    });
  });
});