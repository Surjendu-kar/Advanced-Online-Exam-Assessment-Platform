import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ExamStatusService } from "../../lib/services/examStatusService";
import { StudentService } from "../../lib/services/studentService";
import { ExamService } from "../../lib/services/examService";
import { supabase } from "../../lib/supabaseClient";

describe("Exam Access and Status Integration Tests", () => {
  let testExam: any;
  let testSession: any;
  const mockUserId = "test-user-123";
  const mockTeacherId = "test-teacher-123";

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("Exam Status Management", () => {
    it("should correctly identify upcoming exam status", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const exam = {
        id: "test-exam-1",
        title: "Future Exam",
        start_time: futureTime.toISOString(),
        end_time: new Date(futureTime.getTime() + 1800000).toISOString(), // 30 min duration
        duration: 30,
        is_published: true,
        access_type: "code" as const,
        exam_code: "FUTURE",
        created_by: mockTeacherId,
        description: "Test exam",
        total_marks: 100,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const status = ExamStatusService.getExamStatus(exam);

      expect(status.status).toBe("upcoming");
      expect(status.canJoin).toBe(false);
      expect(status.canStart).toBe(false);
      expect(status.timeUntilStart).toBeGreaterThan(0);
      expect(status.message).toContain("will start");
    });

    it("should correctly identify active exam status", async () => {
      const pastTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const futureTime = new Date(Date.now() + 1800000); // 30 minutes from now

      const exam = {
        id: "test-exam-2",
        title: "Active Exam",
        start_time: pastTime.toISOString(),
        end_time: futureTime.toISOString(),
        duration: 60,
        is_published: true,
        access_type: "code" as const,
        exam_code: "ACTIVE",
        created_by: mockTeacherId,
        description: "Test exam",
        total_marks: 100,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const status = ExamStatusService.getExamStatus(exam);

      expect(status.status).toBe("active");
      expect(status.canJoin).toBe(true);
      expect(status.canStart).toBe(true);
      expect(status.timeUntilEnd).toBeGreaterThan(0);
      expect(status.message).toContain("available");
    });

    it("should correctly identify expired exam status", async () => {
      const pastStartTime = new Date(Date.now() - 7200000); // 2 hours ago
      const pastEndTime = new Date(Date.now() - 3600000); // 1 hour ago

      const exam = {
        id: "test-exam-3",
        title: "Expired Exam",
        start_time: pastStartTime.toISOString(),
        end_time: pastEndTime.toISOString(),
        duration: 60,
        is_published: true,
        access_type: "code" as const,
        exam_code: "EXPIRED",
        created_by: mockTeacherId,
        description: "Test exam",
        total_marks: 100,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const status = ExamStatusService.getExamStatus(exam);

      expect(status.status).toBe("expired");
      expect(status.canJoin).toBe(false);
      expect(status.canStart).toBe(false);
      expect(status.message).toContain("ended");
    });

    it("should handle in-progress session correctly", async () => {
      const exam = {
        id: "test-exam-4",
        title: "In Progress Exam",
        start_time: new Date(Date.now() - 1800000).toISOString(),
        end_time: new Date(Date.now() + 1800000).toISOString(),
        duration: 30,
        is_published: true,
        access_type: "code" as const,
        exam_code: "PROGRESS",
        created_by: mockTeacherId,
        description: "Test exam",
        total_marks: 100,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = {
        id: "test-session-1",
        exam_id: exam.id,
        user_id: mockUserId,
        start_time: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        end_time: null,
        status: "in_progress" as const,
        total_score: 0,
        violations_count: 0,
        created_at: new Date().toISOString(),
      };

      const status = ExamStatusService.getExamStatus(exam, session);

      expect(status.status).toBe("active");
      expect(status.canJoin).toBe(true);
      expect(status.canStart).toBe(false);
      expect(status.timeRemaining).toBeGreaterThan(0);
      expect(status.message).toContain("remaining");
    });

    it("should detect session timeout", async () => {
      const exam = {
        id: "test-exam-5",
        title: "Timeout Exam",
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        duration: 30, // 30 minutes
        is_published: true,
        access_type: "code" as const,
        exam_code: "TIMEOUT",
        created_by: mockTeacherId,
        description: "Test exam",
        total_marks: 100,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = {
        id: "test-session-2",
        exam_id: exam.id,
        user_id: mockUserId,
        start_time: new Date(Date.now() - 2400000).toISOString(), // 40 minutes ago (past 30 min duration)
        end_time: null,
        status: "in_progress" as const,
        total_score: 0,
        violations_count: 0,
        created_at: new Date().toISOString(),
      };

      const status = ExamStatusService.getExamStatus(exam, session);

      expect(status.status).toBe("completed");
      expect(status.canJoin).toBe(false);
      expect(status.canStart).toBe(false);
      expect(status.message).toContain("expired");
    });
  });

  describe("Time Formatting", () => {
    it("should format time remaining correctly", () => {
      // Test various time formats
      expect(ExamStatusService.formatTimeRemaining(5000)).toBe("5 seconds");
      expect(ExamStatusService.formatTimeRemaining(65000)).toBe(
        "1 minute and 5 seconds"
      );
      expect(ExamStatusService.formatTimeRemaining(3665000)).toBe(
        "1 hour and 1 minute"
      );
      expect(ExamStatusService.formatTimeRemaining(90061000)).toBe(
        "1 day and 1 hour"
      );
    });

    it("should format short time remaining correctly", () => {
      expect(ExamStatusService.formatTimeRemainingShort(5000)).toBe("0:05");
      expect(ExamStatusService.formatTimeRemainingShort(65000)).toBe("1:05");
      expect(ExamStatusService.formatTimeRemainingShort(3665000)).toBe(
        "1:01:05"
      );
    });
  });

  describe("Session Time Calculations", () => {
    it("should calculate session time remaining correctly", () => {
      const exam = {
        duration: 30, // 30 minutes
      } as any;

      const session = {
        id: "test-session-3",
        exam_id: "test-exam",
        user_id: mockUserId,
        start_time: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        status: "in_progress" as const,
        total_score: 0,
        violations_count: 0,
        created_at: new Date().toISOString(),
      };

      const timeRemaining = ExamStatusService.getSessionTimeRemaining(
        session,
        exam
      );

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(20 * 60 * 1000); // Should be around 20 minutes
    });

    it("should return null for non-started session", () => {
      const exam = { duration: 30 } as any;
      const session = {
        id: "test-session-4",
        exam_id: "test-exam",
        user_id: mockUserId,
        start_time: null,
        status: "not_started" as const,
        total_score: 0,
        violations_count: 0,
        created_at: new Date().toISOString(),
      };

      const timeRemaining = ExamStatusService.getSessionTimeRemaining(
        session,
        exam
      );
      expect(timeRemaining).toBeNull();
    });
  });

  describe("Exam Access Requirements", () => {
    it("should identify invitation-based exam requirements", () => {
      const exam = {
        access_type: "invitation" as const,
        require_webcam: true,
        max_violations: 5,
      } as any;

      const requirements = ExamStatusService.getExamAccessRequirements(exam);

      expect(requirements.requiresInvitation).toBe(true);
      expect(requirements.requiresCode).toBe(false);
      expect(requirements.requiresWebcam).toBe(true);
      expect(requirements.maxViolations).toBe(5);
    });

    it("should identify code-based exam requirements", () => {
      const exam = {
        access_type: "code" as const,
        require_webcam: false,
        max_violations: 3,
      } as any;

      const requirements = ExamStatusService.getExamAccessRequirements(exam);

      expect(requirements.requiresInvitation).toBe(false);
      expect(requirements.requiresCode).toBe(true);
      expect(requirements.requiresWebcam).toBe(false);
      expect(requirements.maxViolations).toBe(3);
    });

    it("should identify open exam requirements", () => {
      const exam = {
        access_type: "open" as const,
        require_webcam: true,
        max_violations: 2,
      } as any;

      const requirements = ExamStatusService.getExamAccessRequirements(exam);

      expect(requirements.requiresInvitation).toBe(false);
      expect(requirements.requiresCode).toBe(false);
      expect(requirements.requiresWebcam).toBe(true);
      expect(requirements.maxViolations).toBe(2);
    });
  });

  describe("Exam Timing Information", () => {
    it("should provide correct timing information", () => {
      const now = new Date();
      const exam = {
        start_time: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
        end_time: new Date(now.getTime() + 1800000).toISOString(), // 30 min from now
        duration: 60,
      } as any;

      const timing = ExamStatusService.getExamTiming(exam);

      expect(timing.hasStarted).toBe(true);
      expect(timing.hasEnded).toBe(false);
      expect(timing.isActive).toBe(true);
      expect(timing.duration).toBe(60);
      expect(timing.startTime).toBeInstanceOf(Date);
      expect(timing.endTime).toBeInstanceOf(Date);
    });
  });

  // Helper function to clean up test data
  async function cleanupTestData() {
    try {
      // Clean up any test sessions
      if (testSession) {
        await supabase.from("exam_sessions").delete().eq("id", testSession.id);
        testSession = null;
      }

      // Clean up any test exams
      if (testExam) {
        if (Array.isArray(testExam)) {
          for (const exam of testExam) {
            await supabase.from("exams").delete().eq("id", exam.id);
          }
        } else {
          await supabase.from("exams").delete().eq("id", testExam.id);
        }
        testExam = null;
      }

      // Clean up any test data by pattern
      await supabase.from("exam_sessions").delete().like("user_id", "test-%");
      await supabase.from("exams").delete().like("created_by", "test-%");
    } catch (error) {
      console.warn("Cleanup error:", error);
    }
  }
});
