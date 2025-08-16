import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExamStatusService } from "../../lib/services/examStatusService";

describe("StudentService Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ExamStatusService", () => {
    const mockExam = {
      id: "exam-123",
      title: "Test Exam",
      description: "Test Description",
      exam_code: "TEST01",
      created_by: "teacher-123",
      start_time: "",
      end_time: "",
      duration: 30,
      total_marks: 100,
      is_published: true,
      access_type: "code" as const,
      max_attempts: 1,
      shuffle_questions: false,
      show_results_immediately: false,
      require_webcam: true,
      max_violations: 3,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    describe("getExamStatus", () => {
      it("should return upcoming status for future exam", () => {
        const now = new Date("2024-01-01T10:00:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T11:00:00Z", // 1 hour from now
          end_time: "2024-01-01T12:00:00Z", // 2 hours from now
        };

        const status = ExamStatusService.getExamStatus(exam, undefined, now);

        expect(status.status).toBe("upcoming");
        expect(status.canJoin).toBe(false);
        expect(status.canStart).toBe(false);
        expect(status.timeUntilStart).toBe(3600000); // 1 hour in milliseconds
        expect(status.message).toContain("will start");
      });

      it("should return active status for current exam", () => {
        const now = new Date("2024-01-01T10:30:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z", // 30 minutes ago
          end_time: "2024-01-01T11:00:00Z", // 30 minutes from now
        };

        const status = ExamStatusService.getExamStatus(exam, undefined, now);

        expect(status.status).toBe("active");
        expect(status.canJoin).toBe(true);
        expect(status.canStart).toBe(true);
        expect(status.timeUntilEnd).toBe(1800000); // 30 minutes in milliseconds
        expect(status.message).toContain("available");
      });

      it("should return expired status for past exam", () => {
        const now = new Date("2024-01-01T12:00:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z", // 2 hours ago
          end_time: "2024-01-01T11:00:00Z", // 1 hour ago
        };

        const status = ExamStatusService.getExamStatus(exam, undefined, now);

        expect(status.status).toBe("expired");
        expect(status.canJoin).toBe(false);
        expect(status.canStart).toBe(false);
        expect(status.message).toContain("ended");
      });

      it("should handle in-progress session", () => {
        const now = new Date("2024-01-01T10:15:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T11:00:00Z",
          duration: 30, // 30 minutes
        };

        const session = {
          id: "session-123",
          exam_id: exam.id,
          user_id: "user-123",
          start_time: "2024-01-01T10:10:00Z", // 5 minutes ago
          end_time: null,
          status: "in_progress" as const,
          total_score: 0,
          violations_count: 0,
          created_at: "2024-01-01T10:10:00Z",
        };

        const status = ExamStatusService.getExamStatus(exam, session, now);

        expect(status.status).toBe("active");
        expect(status.canJoin).toBe(true);
        expect(status.canStart).toBe(false);
        expect(status.timeRemaining).toBe(1500000); // 25 minutes remaining
        expect(status.message).toContain("remaining");
      });

      it("should handle completed session", () => {
        const now = new Date("2024-01-01T10:30:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T11:00:00Z",
        };

        const session = {
          id: "session-123",
          exam_id: exam.id,
          user_id: "user-123",
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T10:25:00Z",
          status: "completed" as const,
          total_score: 85,
          violations_count: 0,
          created_at: "2024-01-01T10:00:00Z",
        };

        const status = ExamStatusService.getExamStatus(exam, session, now);

        expect(status.status).toBe("completed");
        expect(status.canJoin).toBe(false);
        expect(status.canStart).toBe(false);
        expect(status.message).toContain("completed");
      });

      it("should handle session timeout", () => {
        const now = new Date("2024-01-01T10:45:00Z");
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T11:00:00Z",
          duration: 30, // 30 minutes
        };

        const session = {
          id: "session-123",
          exam_id: exam.id,
          user_id: "user-123",
          start_time: "2024-01-01T10:00:00Z", // 45 minutes ago, but exam duration is only 30 min
          end_time: null,
          status: "in_progress" as const,
          total_score: 0,
          violations_count: 0,
          created_at: "2024-01-01T10:00:00Z",
        };

        const status = ExamStatusService.getExamStatus(exam, session, now);

        expect(status.status).toBe("completed");
        expect(status.canJoin).toBe(false);
        expect(status.canStart).toBe(false);
        expect(status.message).toContain("expired");
      });
    });

    describe("formatTimeRemaining", () => {
      it("should format seconds correctly", () => {
        expect(ExamStatusService.formatTimeRemaining(5000)).toBe("5 seconds");
        expect(ExamStatusService.formatTimeRemaining(1000)).toBe("1 second");
      });

      it("should format minutes and seconds correctly", () => {
        expect(ExamStatusService.formatTimeRemaining(65000)).toBe(
          "1 minute and 5 seconds"
        );
        expect(ExamStatusService.formatTimeRemaining(125000)).toBe(
          "2 minutes and 5 seconds"
        );
      });

      it("should format hours and minutes correctly", () => {
        expect(ExamStatusService.formatTimeRemaining(3665000)).toBe(
          "1 hour and 1 minute"
        );
        expect(ExamStatusService.formatTimeRemaining(7265000)).toBe(
          "2 hours and 1 minute"
        );
      });

      it("should format days and hours correctly", () => {
        expect(ExamStatusService.formatTimeRemaining(90061000)).toBe(
          "1 day and 1 hour"
        );
        expect(ExamStatusService.formatTimeRemaining(180061000)).toBe(
          "2 days and 2 hours"
        );
      });
    });

    describe("formatTimeRemainingShort", () => {
      it("should format short time correctly", () => {
        expect(ExamStatusService.formatTimeRemainingShort(5000)).toBe("0:05");
        expect(ExamStatusService.formatTimeRemainingShort(65000)).toBe("1:05");
        expect(ExamStatusService.formatTimeRemainingShort(3665000)).toBe(
          "1:01:05"
        );
      });
    });

    describe("getSessionTimeRemaining", () => {
      it("should calculate remaining time correctly", () => {
        const exam = { duration: 30 } as any; // 30 minutes
        const now = new Date("2024-01-01T10:15:00Z");

        const session = {
          id: "session-123",
          exam_id: "exam-123",
          user_id: "user-123",
          start_time: "2024-01-01T10:10:00Z", // 5 minutes ago
          end_time: null,
          status: "in_progress" as const,
          total_score: 0,
          violations_count: 0,
          created_at: "2024-01-01T10:10:00Z",
        };

        const timeRemaining = ExamStatusService.getSessionTimeRemaining(
          session,
          exam,
          now
        );

        expect(timeRemaining).toBe(1500000); // 25 minutes in milliseconds
      });

      it("should return null for non-started session", () => {
        const exam = { duration: 30 } as any;
        const session = {
          id: "session-123",
          exam_id: "exam-123",
          user_id: "user-123",
          start_time: null,
          end_time: null,
          status: "not_started" as const,
          total_score: 0,
          violations_count: 0,
          created_at: "2024-01-01T10:10:00Z",
        };

        const timeRemaining = ExamStatusService.getSessionTimeRemaining(
          session,
          exam
        );

        expect(timeRemaining).toBeNull();
      });

      it("should return 0 for expired session", () => {
        const exam = { duration: 30 } as any; // 30 minutes
        const now = new Date("2024-01-01T10:45:00Z");

        const session = {
          id: "session-123",
          exam_id: "exam-123",
          user_id: "user-123",
          start_time: "2024-01-01T10:00:00Z", // 45 minutes ago
          end_time: null,
          status: "in_progress" as const,
          total_score: 0,
          violations_count: 0,
          created_at: "2024-01-01T10:00:00Z",
        };

        const timeRemaining = ExamStatusService.getSessionTimeRemaining(
          session,
          exam,
          now
        );

        expect(timeRemaining).toBe(0);
      });
    });

    describe("getExamAccessRequirements", () => {
      it("should identify invitation requirements", () => {
        const exam = {
          ...mockExam,
          access_type: "invitation" as const,
          require_webcam: true,
          max_violations: 5,
        };

        const requirements = ExamStatusService.getExamAccessRequirements(exam);

        expect(requirements.requiresInvitation).toBe(true);
        expect(requirements.requiresCode).toBe(false);
        expect(requirements.requiresWebcam).toBe(true);
        expect(requirements.maxViolations).toBe(5);
      });

      it("should identify code requirements", () => {
        const exam = {
          ...mockExam,
          access_type: "code" as const,
          require_webcam: false,
          max_violations: 3,
        };

        const requirements = ExamStatusService.getExamAccessRequirements(exam);

        expect(requirements.requiresInvitation).toBe(false);
        expect(requirements.requiresCode).toBe(true);
        expect(requirements.requiresWebcam).toBe(false);
        expect(requirements.maxViolations).toBe(3);
      });

      it("should identify open access requirements", () => {
        const exam = {
          ...mockExam,
          access_type: "open" as const,
          require_webcam: true,
          max_violations: 2,
        };

        const requirements = ExamStatusService.getExamAccessRequirements(exam);

        expect(requirements.requiresInvitation).toBe(false);
        expect(requirements.requiresCode).toBe(false);
        expect(requirements.requiresWebcam).toBe(true);
        expect(requirements.maxViolations).toBe(2);
      });
    });

    describe("getExamTiming", () => {
      it("should provide correct timing information", () => {
        const exam = {
          ...mockExam,
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T11:00:00Z",
          duration: 60,
        };

        const timing = ExamStatusService.getExamTiming(exam);

        expect(timing.startTime).toEqual(new Date("2024-01-01T10:00:00Z"));
        expect(timing.endTime).toEqual(new Date("2024-01-01T11:00:00Z"));
        expect(timing.duration).toBe(60);
        expect(timing.hasStarted).toBeDefined();
        expect(timing.hasEnded).toBeDefined();
        expect(timing.isActive).toBeDefined();
      });
    });
  });
});
