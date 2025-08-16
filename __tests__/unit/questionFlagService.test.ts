import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the entire supabaseClient module
vi.mock("../../lib/supabaseClient", () => {
  const mockSupabase = {
    from: vi.fn(),
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

import { QuestionFlagService } from "../../lib/services/questionFlagService";
import { SupabaseError, supabase } from "../../lib/supabaseClient";

describe("QuestionFlagService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("flagQuestion", () => {
    it("should flag a question successfully", async () => {
      const mockSession = {
        id: "session-1",
        user_id: "user-1",
      };

      const mockFlag = {
        id: "flag-1",
        session_id: "session-1",
        question_id: "mcq-1",
        question_type: "mcq",
        is_flagged: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

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

      // Mock existing flag check (not found)
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Mock flag creation
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFlag,
              error: null,
            }),
          }),
        }),
      });

      const result = await QuestionFlagService.flagQuestion("user-1", {
        session_id: "session-1",
        question_id: "mcq-1",
        question_type: "mcq",
        is_flagged: true,
      });

      expect(result).toMatchObject({
        id: "flag-1",
        session_id: "session-1",
        question_id: "mcq-1",
        question_type: "mcq",
        is_flagged: true,
      });
    });

    it("should throw error for invalid session", async () => {
      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      // Mock session verification (not found)
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      await expect(
        QuestionFlagService.flagQuestion("user-1", {
          session_id: "invalid-session",
          question_id: "mcq-1",
          question_type: "mcq",
          is_flagged: true,
        })
      ).rejects.toThrow("Session not found or access denied");
    });
  });

  describe("getFlaggedQuestions", () => {
    it("should return flagged questions for a session", async () => {
      const mockSession = {
        id: "session-1",
        user_id: "user-1",
      };

      const mockFlags = [
        {
          id: "flag-1",
          session_id: "session-1",
          question_id: "mcq-1",
          question_type: "mcq",
          is_flagged: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "flag-2",
          session_id: "session-1",
          question_id: "saq-1",
          question_type: "saq",
          is_flagged: true,
          created_at: new Date().toISOString(),
        },
      ];

      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

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

      // Mock flags fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockFlags,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await QuestionFlagService.getFlaggedQuestions(
        "user-1",
        "session-1"
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "flag-1",
        question_id: "mcq-1",
        question_type: "mcq",
        is_flagged: true,
      });
    });
  });

  describe("getQuestionFlagStatus", () => {
    it("should return true for flagged question", async () => {
      const mockSession = {
        id: "session-1",
        user_id: "user-1",
      };

      const mockFlag = {
        is_flagged: true,
      };

      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

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

      // Mock flag status fetch
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockFlag,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await QuestionFlagService.getQuestionFlagStatus(
        "user-1",
        "session-1",
        "mcq-1"
      );

      expect(result).toBe(true);
    });

    it("should return false for unflagged question", async () => {
      const mockSession = {
        id: "session-1",
        user_id: "user-1",
      };

      // Mock table existence check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

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

      // Mock flag status fetch (not found)
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      const result = await QuestionFlagService.getQuestionFlagStatus(
        "user-1",
        "session-1",
        "mcq-1"
      );

      expect(result).toBe(false);
    });
  });
});
