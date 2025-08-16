import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the entire supabaseClient module
vi.mock("../../lib/supabaseClient", () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  return {
    supabase: mockSupabase,
    SupabaseError: class extends Error {
      constructor(
        message: string,
        public code: string,
        public originalError?: any
      ) {
        super(message);
        this.name = "SupabaseError";
      }
    },
  };
});

import { ExamSessionService } from "../../lib/services/examSessionService";
import { SupabaseError, supabase } from "../../lib/supabaseClient";

describe("ExamSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("submitMCQAnswer", () => {
    it("should submit MCQ answer successfully", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockExam = {
        duration: 60,
      };

      const mockQuestion = {
        id: "mcq-1",
        exam_id: "exam-1",
        user_id: "user-1",
        question_text: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correct_option: 1,
        marks: 2,
        selected_option: null,
      };

      const mockUpdatedQuestion = {
        ...mockQuestion,
        selected_option: 1,
        is_correct: true,
        marks_obtained: 2,
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock exam duration fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExam,
              error: null,
            }),
          }),
        }),
      });

      // Mock question fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQuestion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock question update
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedQuestion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await ExamSessionService.submitMCQAnswer("user-1", {
        session_id: "session-1",
        question_id: "mcq-1",
        selected_option: 1,
      });

      expect(result).toMatchObject({
        id: "mcq-1",
        selected_option: 1,
        is_correct: true,
        marks_obtained: 2,
      });
    });

    it("should mark incorrect answer correctly", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockExam = {
        duration: 60,
      };

      const mockQuestion = {
        id: "mcq-1",
        exam_id: "exam-1",
        user_id: "user-1",
        question_text: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correct_option: 1,
        marks: 2,
        selected_option: null,
      };

      const mockUpdatedQuestion = {
        ...mockQuestion,
        selected_option: 0, // Wrong answer
        is_correct: false,
        marks_obtained: 0,
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock exam duration fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExam,
              error: null,
            }),
          }),
        }),
      });

      // Mock question fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQuestion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock question update
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedQuestion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await ExamSessionService.submitMCQAnswer("user-1", {
        session_id: "session-1",
        question_id: "mcq-1",
        selected_option: 0, // Wrong answer
      });

      expect(result).toMatchObject({
        id: "mcq-1",
        selected_option: 0,
        is_correct: false,
        marks_obtained: 0,
      });
    });

    it("should throw error for invalid option", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockExam = {
        duration: 60,
      };

      const mockQuestion = {
        id: "mcq-1",
        exam_id: "exam-1",
        user_id: "user-1",
        question_text: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correct_option: 1,
        marks: 2,
        selected_option: null,
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock exam duration fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExam,
              error: null,
            }),
          }),
        }),
      });

      // Mock question fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQuestion,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(
        ExamSessionService.submitMCQAnswer("user-1", {
          session_id: "session-1",
          question_id: "mcq-1",
          selected_option: 5, // Invalid option (out of range)
        })
      ).rejects.toThrow("Invalid option selected");
    });

    it("should throw error for inactive session", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "completed", // Not in_progress
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        ExamSessionService.submitMCQAnswer("user-1", {
          session_id: "session-1",
          question_id: "mcq-1",
          selected_option: 1,
        })
      ).rejects.toThrow("Session is not active");
    });
  });

  describe("submitExam", () => {
    it("should submit exam successfully", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockMCQAnswers = [
        { marks_obtained: 2 },
        { marks_obtained: 1 },
        { marks_obtained: 0 },
      ];

      const mockUpdatedSession = {
        ...mockSession,
        status: "completed",
        end_time: new Date().toISOString(),
        total_score: 3,
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock MCQ answers fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockMCQAnswers,
              error: null,
            }),
          }),
        }),
      });

      // Mock session update
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedSession,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await ExamSessionService.submitExam("user-1", "session-1");

      expect(result).toMatchObject({
        id: "session-1",
        status: "completed",
        total_score: 3,
      });
      expect(result.end_time).toBeDefined();
    });

    it("should throw error for already completed exam", async () => {
      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "completed",
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock session verification
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        ExamSessionService.submitExam("user-1", "session-1")
      ).rejects.toThrow("Exam already submitted");
    });
  });
});
