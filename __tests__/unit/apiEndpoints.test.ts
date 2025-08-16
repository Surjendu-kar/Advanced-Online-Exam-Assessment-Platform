import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the services
vi.mock("../../lib/services/studentService", () => ({
  StudentService: {
    handleInvitationLink: vi.fn(),
    validateExamAccess: vi.fn(),
    joinExam: vi.fn(),
    startExamSession: vi.fn(),
    getStudentExams: vi.fn(),
  },
}));

vi.mock("../../lib/auth", () => ({
  AuthService: {
    getCurrentUser: vi.fn(),
  },
}));

describe("Student API Endpoints Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Invitation API", () => {
    it("should handle valid invitation token", async () => {
      const { StudentService } = await import(
        "../../lib/services/studentService"
      );
      const mockResult = {
        user: {
          id: "user-123",
          email: "student@test.com",
          profile: { role: "student" },
        },
        exam: { id: "exam-123", title: "Test Exam" },
        redirectTo: "/student/exams",
      };

      vi.mocked(StudentService.handleInvitationLink).mockResolvedValue(
        mockResult
      );

      // Import the API handler
      const { GET } = await import("../../app/api/student/invitation/route");

      // Create mock request
      const request = new NextRequest(
        "http://localhost:3000/api/student/invitation?token=test-token"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(StudentService.handleInvitationLink).toHaveBeenCalledWith(
        "test-token"
      );
    });

    it("should handle missing token", async () => {
      const { GET } = await import("../../app/api/student/invitation/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/invitation"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invitation token is required");
    });
  });

  describe("Exam Access API", () => {
    it("should validate exam access for authenticated student", async () => {
      const { AuthService } = await import("../../lib/auth");
      const { StudentService } = await import(
        "../../lib/services/studentService"
      );

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      const mockValidation = {
        canAccess: true,
        exam: { id: "exam-123", title: "Test Exam" },
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(StudentService.validateExamAccess).mockResolvedValue(
        mockValidation
      );

      const { POST } = await import("../../app/api/student/exam-access/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/exam-access",
        {
          method: "POST",
          body: JSON.stringify({ examId: "exam-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockValidation);
      expect(StudentService.validateExamAccess).toHaveBeenCalledWith(
        "user-123",
        "exam-123"
      );
    });

    it("should reject unauthenticated requests", async () => {
      const { AuthService } = await import("../../lib/auth");

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(null);

      const { POST } = await import("../../app/api/student/exam-access/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/exam-access",
        {
          method: "POST",
          body: JSON.stringify({ examId: "exam-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should reject non-student users", async () => {
      const { AuthService } = await import("../../lib/auth");

      const mockUser = {
        id: "user-123",
        email: "teacher@test.com",
        profile: { role: "teacher" as const },
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);

      const { POST } = await import("../../app/api/student/exam-access/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/exam-access",
        {
          method: "POST",
          body: JSON.stringify({ examId: "exam-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Student access required");
    });
  });

  describe("Join Exam API", () => {
    it("should join exam with valid code", async () => {
      const { AuthService } = await import("../../lib/auth");
      const { StudentService } = await import(
        "../../lib/services/studentService"
      );

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      const mockSession = {
        id: "session-123",
        exam_id: "exam-123",
        user_id: "user-123",
        status: "not_started" as const,
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(StudentService.joinExam).mockResolvedValue(mockSession);

      const { POST } = await import("../../app/api/student/join-exam/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/join-exam",
        {
          method: "POST",
          body: JSON.stringify({ examCode: "TEST01" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.session).toEqual(mockSession);
      expect(StudentService.joinExam).toHaveBeenCalledWith("user-123", {
        examCode: "TEST01",
      });
    });

    it("should require exam code or invitation token", async () => {
      const { AuthService } = await import("../../lib/auth");

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);

      const { POST } = await import("../../app/api/student/join-exam/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/join-exam",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Either exam code or invitation token is required"
      );
    });
  });

  describe("Start Session API", () => {
    it("should start exam session", async () => {
      const { AuthService } = await import("../../lib/auth");
      const { StudentService } = await import(
        "../../lib/services/studentService"
      );

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      const mockSession = {
        id: "session-123",
        exam_id: "exam-123",
        user_id: "user-123",
        status: "in_progress" as const,
        start_time: new Date().toISOString(),
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(StudentService.startExamSession).mockResolvedValue(mockSession);

      const { POST } = await import(
        "../../app/api/student/start-session/route"
      );

      const request = new NextRequest(
        "http://localhost:3000/api/student/start-session",
        {
          method: "POST",
          body: JSON.stringify({ sessionId: "session-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.session).toEqual(mockSession);
      expect(StudentService.startExamSession).toHaveBeenCalledWith(
        "user-123",
        "session-123"
      );
    });

    it("should require session ID", async () => {
      const { AuthService } = await import("../../lib/auth");

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);

      const { POST } = await import(
        "../../app/api/student/start-session/route"
      );

      const request = new NextRequest(
        "http://localhost:3000/api/student/start-session",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Session ID is required");
    });
  });

  describe("Student Exams API", () => {
    it("should get student exams with filters", async () => {
      const { AuthService } = await import("../../lib/auth");
      const { StudentService } = await import(
        "../../lib/services/studentService"
      );

      const mockUser = {
        id: "user-123",
        email: "student@test.com",
        profile: { role: "student" as const },
      };

      const mockExams = [
        {
          id: "exam-1",
          title: "Active Exam",
          status: "active" as const,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: "exam-2",
          title: "Upcoming Exam",
          status: "upcoming" as const,
          start_time: new Date(Date.now() + 3600000).toISOString(),
          end_time: new Date(Date.now() + 7200000).toISOString(),
        },
      ];

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(StudentService.getStudentExams).mockResolvedValue(mockExams);

      const { GET } = await import("../../app/api/student/exams/route");

      const request = new NextRequest(
        "http://localhost:3000/api/student/exams?status=active&limit=10"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.exams).toEqual(mockExams);
      expect(StudentService.getStudentExams).toHaveBeenCalledWith("user-123", {
        status: "active",
        search: undefined,
        limit: 10,
        offset: undefined,
      });
    });
  });
});
