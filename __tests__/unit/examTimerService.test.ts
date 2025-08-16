import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the entire supabaseClient module
vi.mock("../../lib/supabaseClient", () => {
  const mockSupabase = {
    from: vi.fn(),
    raw: vi.fn(),
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

// Mock ExamSessionService
vi.mock("../../lib/services/examSessionService", () => ({
  ExamSessionService: {
    autoSubmitExam: vi.fn(),
  },
}));

import { ExamTimerService } from "../../lib/services/examTimerService";
import { SupabaseError, supabase } from "../../lib/supabaseClient";
import { ExamSessionService } from "../../lib/services/examSessionService";

describe("ExamTimerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("getTimerInfo", () => {
    it("should return correct timer information", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      vi.setSystemTime(now);

      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: "2024-01-01T09:30:00Z", // 30 minutes ago
        created_at: "2024-01-01T09:30:00Z",
        exams: {
          duration: 60, // 60 minutes
        },
      };

      // Mock session fetch with exam details
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

      const result = await ExamTimerService.getTimerInfo("user-1", "session-1");

      expect(result).toMatchObject({
        session_id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        start_time: "2024-01-01T09:30:00Z",
        duration_minutes: 60,
        time_remaining_seconds: 1800, // 30 minutes remaining
        is_expired: false,
      });
    });

    it("should auto-submit expired session", async () => {
      const now = new Date("2024-01-01T11:00:00Z");
      vi.setSystemTime(now);

      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: "2024-01-01T09:30:00Z", // 90 minutes ago
        created_at: "2024-01-01T09:30:00Z",
        exams: {
          duration: 60, // 60 minutes
        },
      };

      // Mock session fetch
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

      const result = await ExamTimerService.getTimerInfo("user-1", "session-1");

      expect(result.is_expired).toBe(true);
      expect(result.time_remaining_seconds).toBe(0);
      expect(ExamSessionService.autoSubmitExam).toHaveBeenCalledWith(
        "session-1"
      );
    });

    it("should throw error for non-existent session", async () => {
      // Mock session fetch (not found)
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
        ExamTimerService.getTimerInfo("user-1", "invalid-session")
      ).rejects.toThrow("Session not found or access denied");
    });
  });

  describe("formatTimeRemaining", () => {
    it("should format time correctly", () => {
      expect(ExamTimerService.formatTimeRemaining(3661)).toBe("01:01:01");
      expect(ExamTimerService.formatTimeRemaining(3600)).toBe("01:00:00");
      expect(ExamTimerService.formatTimeRemaining(61)).toBe("00:01:01");
      expect(ExamTimerService.formatTimeRemaining(60)).toBe("00:01:00");
      expect(ExamTimerService.formatTimeRemaining(59)).toBe("00:00:59");
      expect(ExamTimerService.formatTimeRemaining(0)).toBe("00:00:00");
      expect(ExamTimerService.formatTimeRemaining(-10)).toBe("00:00:00");
    });
  });

  describe("getTimeWarnings", () => {
    it("should return critical warning for expired time", () => {
      const result = ExamTimerService.getTimeWarnings(0);
      expect(result.warning_type).toBe("critical");
      expect(result.message).toContain("Time has expired");
    });

    it("should return critical warning for less than 1 minute", () => {
      const result = ExamTimerService.getTimeWarnings(30);
      expect(result.warning_type).toBe("critical");
      expect(result.message).toContain("Less than 1 minute");
    });

    it("should return warning for 5 minutes remaining", () => {
      const result = ExamTimerService.getTimeWarnings(300);
      expect(result.warning_type).toBe("warning");
      expect(result.message).toContain("5 minutes remaining");
    });

    it("should return info for 10 minutes remaining", () => {
      const result = ExamTimerService.getTimeWarnings(600);
      expect(result.warning_type).toBe("info");
      expect(result.message).toContain("10 minutes remaining");
    });

    it("should return null for plenty of time", () => {
      const result = ExamTimerService.getTimeWarnings(1800);
      expect(result.warning_type).toBe(null);
      expect(result.message).toBe(null);
    });
  });

  describe("checkSessionExpiry", () => {
    it("should return true for expired session", async () => {
      const now = new Date("2024-01-01T11:00:00Z");
      vi.setSystemTime(now);

      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: "2024-01-01T09:30:00Z", // 90 minutes ago
        created_at: "2024-01-01T09:30:00Z",
        exams: {
          duration: 60, // 60 minutes
        },
      };

      // Mock session fetch
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

      const result = await ExamTimerService.checkSessionExpiry(
        "user-1",
        "session-1"
      );
      expect(result).toBe(true);
    });

    it("should return false for active session", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      vi.setSystemTime(now);

      const mockSession = {
        id: "session-1",
        exam_id: "exam-1",
        user_id: "user-1",
        status: "in_progress",
        start_time: "2024-01-01T09:30:00Z", // 30 minutes ago
        created_at: "2024-01-01T09:30:00Z",
        exams: {
          duration: 60, // 60 minutes
        },
      };

      // Mock session fetch
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

      const result = await ExamTimerService.checkSessionExpiry(
        "user-1",
        "session-1"
      );
      expect(result).toBe(false);
    });
  });
});
