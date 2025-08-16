import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StudentService } from "../../lib/services/studentService";
import { ExamService } from "../../lib/services/examService";
import { AuthService } from "../../lib/auth";
import { supabase } from "../../lib/supabaseClient";

// Mock data
const mockTeacher = {
  id: "teacher-123",
  email: "teacher@test.com",
  profile: { role: "teacher" as const },
};

const mockStudent = {
  id: "student-123",
  email: "student@test.com",
  profile: { role: "student" as const },
};

const mockExam = {
  title: "Test Exam",
  description: "Test exam description",
  start_time: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
  end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  duration: 30,
  access_type: "invitation" as const,
};

describe("Student Registration and Exam Access Integration Tests", () => {
  let createdExam: any;
  let createdInvitation: any;
  let createdSession: any;

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe("Invitation Link Processing", () => {
    it("should process valid invitation link and create student account", async () => {
      // Create test exam
      createdExam = await ExamService.createExam(mockTeacher.id, mockExam);

      // Create invitation
      const invitationToken = generateTestToken();
      const { data: invitation } = await supabase
        .from("student_invitations")
        .insert({
          teacher_id: mockTeacher.id,
          student_email: "newstudent@test.com",
          invitation_token: invitationToken,
          exam_id: createdExam.id,
          status: "pending",
          expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
        })
        .select()
        .single();

      createdInvitation = invitation;

      // Process invitation
      const result = await StudentService.handleInvitationLink(invitationToken);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("newstudent@test.com");
      expect(result.user.profile?.role).toBe("student");
      expect(result.exam).toBeDefined();
      expect(result.exam.id).toBe(createdExam.id);
      expect(result.redirectTo).toContain(
        createdExam.exam_code || createdExam.id
      );

      // Verify invitation status updated
      const { data: updatedInvitation } = await supabase
        .from("student_invitations")
        .select("status")
        .eq("id", invitation.id)
        .single();

      expect(updatedInvitation?.status).toBe("accepted");
    });

    it("should handle expired invitation link", async () => {
      // Create expired invitation
      const invitationToken = generateTestToken();
      const { data: invitation } = await supabase
        .from("student_invitations")
        .insert({
          teacher_id: mockTeacher.id,
          student_email: "expired@test.com",
          invitation_token: invitationToken,
          status: "pending",
          expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        })
        .select()
        .single();

      createdInvitation = invitation;

      // Process invitation should fail
      await expect(
        StudentService.handleInvitationLink(invitationToken)
      ).rejects.toThrow("Invitation link has expired");

      // Verify invitation marked as expired
      const { data: updatedInvitation } = await supabase
        .from("student_invitations")
        .select("status")
        .eq("id", invitation.id)
        .single();

      expect(updatedInvitation?.status).toBe("expired");
    });

    it("should handle invalid invitation token", async () => {
      await expect(
        StudentService.handleInvitationLink("invalid-token")
      ).rejects.toThrow("Invalid or expired invitation link");
    });
  });

  describe("Exam Access Validation", () => {
    beforeEach(async () => {
      // Create test exam
      createdExam = await ExamService.createExam(mockTeacher.id, mockExam);
    });

    it("should validate access for invited student", async () => {
      // Create invitation
      const { data: invitation } = await supabase
        .from("student_invitations")
        .insert({
          teacher_id: mockTeacher.id,
          student_email: mockStudent.email,
          invitation_token: generateTestToken(),
          exam_id: createdExam.id,
          status: "accepted",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      createdInvitation = invitation;

      // Mock getCurrentUser to return our test student
      const originalGetCurrentUser = AuthService.getCurrentUser;
      AuthService.getCurrentUser = vi.fn().mockResolvedValue(mockStudent);

      const validation = await StudentService.validateExamAccess(
        mockStudent.id,
        createdExam.id
      );

      expect(validation.canAccess).toBe(true);
      expect(validation.exam).toBeDefined();
      expect(validation.exam.id).toBe(createdExam.id);

      // Restore original method
      AuthService.getCurrentUser = originalGetCurrentUser;
    });

    it("should deny access for non-invited student", async () => {
      const validation = await StudentService.validateExamAccess(
        "uninvited-student",
        createdExam.id
      );

      expect(validation.canAccess).toBe(false);
      expect(validation.reason).toBe("You are not invited to this exam");
    });

    it("should deny access for exam that hasn't started", async () => {
      // Create future exam
      const futureExam = await ExamService.createExam(mockTeacher.id, {
        ...mockExam,
        start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        end_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      });

      const validation = await StudentService.validateExamAccess(
        mockStudent.id,
        futureExam.id
      );

      expect(validation.canAccess).toBe(false);
      expect(validation.reason).toBe("Exam has not started yet");

      // Cleanup
      await supabase.from("exams").delete().eq("id", futureExam.id);
    });

    it("should deny access for ended exam", async () => {
      // Create past exam
      const pastExam = await ExamService.createExam(mockTeacher.id, {
        ...mockExam,
        start_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        end_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      const validation = await StudentService.validateExamAccess(
        mockStudent.id,
        pastExam.id
      );

      expect(validation.canAccess).toBe(false);
      expect(validation.reason).toBe("Exam has ended");

      // Cleanup
      await supabase.from("exams").delete().eq("id", pastExam.id);
    });
  });

  describe("Exam Joining", () => {
    beforeEach(async () => {
      // Create test exam with code access
      createdExam = await ExamService.createExam(mockTeacher.id, {
        ...mockExam,
        access_type: "code",
        exam_code: "TEST01",
      });
    });

    it("should join exam with valid code", async () => {
      const session = await StudentService.joinExam(mockStudent.id, {
        examCode: "TEST01",
      });

      expect(session).toBeDefined();
      expect(session.exam_id).toBe(createdExam.id);
      expect(session.user_id).toBe(mockStudent.id);
      expect(session.status).toBe("not_started");

      createdSession = session;
    });

    it("should reject invalid exam code", async () => {
      await expect(
        StudentService.joinExam(mockStudent.id, {
          examCode: "INVALID",
        })
      ).rejects.toThrow("Invalid exam code");
    });

    it("should start exam session", async () => {
      // First join exam
      const session = await StudentService.joinExam(mockStudent.id, {
        examCode: "TEST01",
      });

      createdSession = session;

      // Start session
      const startedSession = await StudentService.startExamSession(
        mockStudent.id,
        session.id
      );

      expect(startedSession.status).toBe("in_progress");
      expect(startedSession.start_time).toBeDefined();
    });

    it("should not allow starting already started session", async () => {
      // Join and start exam
      const session = await StudentService.joinExam(mockStudent.id, {
        examCode: "TEST01",
      });

      await StudentService.startExamSession(mockStudent.id, session.id);

      // Try to start again
      await expect(
        StudentService.startExamSession(mockStudent.id, session.id)
      ).rejects.toThrow("Session has already been started");

      createdSession = session;
    });
  });

  describe("Student Exam Listing", () => {
    beforeEach(async () => {
      // Create multiple test exams
      const upcomingExam = await ExamService.createExam(mockTeacher.id, {
        ...mockExam,
        title: "Upcoming Exam",
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 7200000).toISOString(),
      });

      const activeExam = await ExamService.createExam(mockTeacher.id, {
        ...mockExam,
        title: "Active Exam",
        start_time: new Date(Date.now() - 1800000).toISOString(),
        end_time: new Date(Date.now() + 1800000).toISOString(),
      });

      // Create invitations for both exams
      await supabase.from("student_invitations").insert([
        {
          teacher_id: mockTeacher.id,
          student_email: mockStudent.email,
          invitation_token: generateTestToken(),
          exam_id: upcomingExam.id,
          status: "accepted",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          teacher_id: mockTeacher.id,
          student_email: mockStudent.email,
          invitation_token: generateTestToken(),
          exam_id: activeExam.id,
          status: "accepted",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ]);

      // Store for cleanup
      createdExam = [upcomingExam, activeExam];
    });

    it("should get student exams with correct status", async () => {
      // Mock getCurrentUser
      const originalGetCurrentUser = AuthService.getCurrentUser;
      AuthService.getCurrentUser = vi.fn().mockResolvedValue(mockStudent);

      const exams = await StudentService.getStudentExams(mockStudent.id);

      expect(exams).toHaveLength(2);

      const upcomingExam = exams.find((e) => e.title === "Upcoming Exam");
      const activeExam = exams.find((e) => e.title === "Active Exam");

      expect(upcomingExam?.status).toBe("upcoming");
      expect(activeExam?.status).toBe("active");

      // Restore original method
      AuthService.getCurrentUser = originalGetCurrentUser;
    });

    it("should filter exams by status", async () => {
      // Mock getCurrentUser
      const originalGetCurrentUser = AuthService.getCurrentUser;
      AuthService.getCurrentUser = vi.fn().mockResolvedValue(mockStudent);

      const activeExams = await StudentService.getStudentExams(mockStudent.id, {
        status: "active",
      });

      expect(activeExams).toHaveLength(1);
      expect(activeExams[0].title).toBe("Active Exam");

      // Restore original method
      AuthService.getCurrentUser = originalGetCurrentUser;
    });
  });

  // Helper functions
  function generateTestToken(): string {
    return `test-token-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  async function cleanupTestData() {
    try {
      // Clean up in reverse dependency order
      if (createdSession) {
        await supabase
          .from("exam_sessions")
          .delete()
          .eq("id", createdSession.id);
        createdSession = null;
      }

      if (createdInvitation) {
        await supabase
          .from("student_invitations")
          .delete()
          .eq("id", createdInvitation.id);
        createdInvitation = null;
      }

      if (createdExam) {
        if (Array.isArray(createdExam)) {
          for (const exam of createdExam) {
            await supabase.from("exams").delete().eq("id", exam.id);
          }
        } else {
          await supabase.from("exams").delete().eq("id", createdExam.id);
        }
        createdExam = null;
      }

      // Clean up any test users created during tests
      await supabase.from("user_profiles").delete().like("id", "test-%");

      // Clean up any test invitations
      await supabase
        .from("student_invitations")
        .delete()
        .like("invitation_token", "test-token-%");
    } catch (error) {
      console.warn("Cleanup error:", error);
    }
  }
});
