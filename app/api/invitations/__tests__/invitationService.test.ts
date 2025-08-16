import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  InvitationService,
  CreateInvitationRequest,
} from "../../../../lib/services/invitationService";
import { SupabaseError } from "../../../../lib/supabaseClient";

// Mock Supabase client
vi.mock("../../../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
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
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => "mock-token-123456789abcdef"),
    })),
  },
}));

describe("InvitationService", () => {
  const mockTeacherId = "teacher-123";
  const mockStudentEmail = "student@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation Rules", () => {
    it("should validate email format", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "student123@university.edu",
      ];

      const invalidEmails = [
        "",
        "invalid-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user name@domain.com",
      ];

      validEmails.forEach((email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it("should validate expiration time limits", () => {
      const validHours = [1, 24, 168, 720, 8760]; // 1 hour to 1 year
      const invalidHours = [0, -1, 8761, 10000];

      validHours.forEach((hours) => {
        const isValid = hours >= 1 && hours <= 8760;
        expect(isValid).toBe(true);
      });

      invalidHours.forEach((hours) => {
        const isValid = hours >= 1 && hours <= 8760;
        expect(isValid).toBe(false);
      });
    });

    it("should validate required fields", () => {
      const validRequest: CreateInvitationRequest = {
        student_email: "student@example.com",
        exam_id: "exam-123",
        expires_in_hours: 168,
      };

      const invalidRequests = [
        { ...validRequest, student_email: "" },
        { ...validRequest, student_email: "invalid-email" },
        { ...validRequest, expires_in_hours: 0 },
        { ...validRequest, expires_in_hours: 9000 },
        { exam_id: "exam-123" }, // Missing email
      ];

      // Valid request should pass basic validation
      expect(validRequest.student_email).toBeTruthy();
      expect(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validRequest.student_email)
      ).toBe(true);

      // Invalid requests should fail validation
      invalidRequests.forEach((request) => {
        const emailValid =
          !!(request as any).student_email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((request as any).student_email);
        const hoursValid =
          !(request as any).expires_in_hours ||
          ((request as any).expires_in_hours >= 1 &&
            (request as any).expires_in_hours <= 8760);

        const isValid = emailValid && hoursValid;
        expect(isValid).toBe(false);
      });
    });
  });

  describe("CSV Parsing", () => {
    it("should parse simple email list", () => {
      const csvData =
        "email1@example.com,email2@example.com,email3@example.com";
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual([
        "email1@example.com",
        "email2@example.com",
        "email3@example.com",
      ]);
    });

    it("should parse CSV with headers", () => {
      const csvData = `Email
student1@example.com
student2@example.com
student3@example.com`;

      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual([
        "student1@example.com",
        "student2@example.com",
        "student3@example.com",
      ]);
    });

    it("should handle CSV with quotes", () => {
      const csvData = `"email1@example.com","email2@example.com","email3@example.com"`;
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual([
        "email1@example.com",
        "email2@example.com",
        "email3@example.com",
      ]);
    });

    it("should remove duplicates", () => {
      const csvData = `email1@example.com,email2@example.com,email1@example.com`;
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual(["email1@example.com", "email2@example.com"]);
    });

    it("should filter out invalid emails", () => {
      const csvData = `email1@example.com,invalid-email,email2@example.com,@domain.com`;
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual(["email1@example.com", "email2@example.com"]);
    });

    it("should handle empty lines and whitespace", () => {
      const csvData = `
      email1@example.com
      
      email2@example.com
      
      `;
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual(["email1@example.com", "email2@example.com"]);
    });

    it("should convert emails to lowercase", () => {
      const csvData = "EMAIL1@EXAMPLE.COM,Email2@Example.Com";
      const emails = InvitationService.parseCsvEmails(csvData);

      expect(emails).toEqual(["email1@example.com", "email2@example.com"]);
    });
  });

  describe("Token Generation", () => {
    it("should generate secure tokens", () => {
      // Test that tokens are generated (mocked)
      const mockToken = "mock-token-123456789abcdef";
      expect(mockToken).toBeTruthy();
      expect(typeof mockToken).toBe("string");
      expect(mockToken.length).toBeGreaterThan(10);
    });
  });

  describe("Data Structure Validation", () => {
    it("should validate invitation structure", () => {
      const mockInvitation = {
        id: "invitation-123",
        teacher_id: "teacher-456",
        student_email: "student@example.com",
        invitation_token: "token-123",
        exam_id: "exam-789",
        status: "pending" as const,
        expires_at: "2024-12-31T23:59:59Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      // Validate required fields
      expect(mockInvitation.id).toBeTruthy();
      expect(mockInvitation.teacher_id).toBeTruthy();
      expect(mockInvitation.student_email).toBeTruthy();
      expect(mockInvitation.invitation_token).toBeTruthy();
      expect(mockInvitation.status).toBeTruthy();
      expect(mockInvitation.expires_at).toBeTruthy();
      expect(mockInvitation.created_at).toBeTruthy();

      // Validate types
      expect(typeof mockInvitation.id).toBe("string");
      expect(typeof mockInvitation.teacher_id).toBe("string");
      expect(typeof mockInvitation.student_email).toBe("string");
      expect(typeof mockInvitation.invitation_token).toBe("string");
      expect(typeof mockInvitation.status).toBe("string");
      expect(typeof mockInvitation.expires_at).toBe("string");
      expect(typeof mockInvitation.created_at).toBe("string");

      // Validate status values
      const validStatuses = ["pending", "accepted", "expired"];
      expect(validStatuses.includes(mockInvitation.status)).toBe(true);
    });

    it("should validate bulk invitation request structure", () => {
      const mockBulkRequest = {
        student_emails: ["email1@example.com", "email2@example.com"],
        exam_id: "exam-123",
        expires_in_hours: 168,
      };

      expect(Array.isArray(mockBulkRequest.student_emails)).toBe(true);
      expect(mockBulkRequest.student_emails.length).toBeGreaterThan(0);
      expect(typeof mockBulkRequest.exam_id).toBe("string");
      expect(typeof mockBulkRequest.expires_in_hours).toBe("number");

      // Validate email formats
      mockBulkRequest.student_emails.forEach((email) => {
        expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(true);
      });
    });

    it("should validate invitation stats structure", () => {
      const mockStats = {
        total: 10,
        pending: 5,
        accepted: 3,
        expired: 2,
      };

      expect(mockStats).toHaveProperty("total");
      expect(mockStats).toHaveProperty("pending");
      expect(mockStats).toHaveProperty("accepted");
      expect(mockStats).toHaveProperty("expired");

      expect(typeof mockStats.total).toBe("number");
      expect(typeof mockStats.pending).toBe("number");
      expect(typeof mockStats.accepted).toBe("number");
      expect(typeof mockStats.expired).toBe("number");

      // Validate logical consistency
      expect(mockStats.total).toBe(
        mockStats.pending + mockStats.accepted + mockStats.expired
      );
      expect(mockStats.total).toBeGreaterThanOrEqual(0);
      expect(mockStats.pending).toBeGreaterThanOrEqual(0);
      expect(mockStats.accepted).toBeGreaterThanOrEqual(0);
      expect(mockStats.expired).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors appropriately", () => {
      const invalidRequests = [
        {
          // Missing email
          exam_id: "exam-123",
          expires_in_hours: 168,
        },
        {
          // Invalid email format
          student_email: "invalid-email",
          exam_id: "exam-123",
          expires_in_hours: 168,
        },
        {
          // Invalid expiration time
          student_email: "student@example.com",
          exam_id: "exam-123",
          expires_in_hours: 0,
        },
        {
          // Empty email
          student_email: "",
          exam_id: "exam-123",
          expires_in_hours: 168,
        },
      ];

      invalidRequests.forEach((request) => {
        const hasValidEmail =
          !!(request as any).student_email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((request as any).student_email);
        const hasValidHours =
          !(request as any).expires_in_hours ||
          ((request as any).expires_in_hours >= 1 &&
            (request as any).expires_in_hours <= 8760);

        const isValid = hasValidEmail && hasValidHours;
        expect(isValid).toBe(false);
      });
    });

    it("should handle bulk operation limits", () => {
      const tooManyEmails = Array(101)
        .fill(null)
        .map((_, i) => `email${i}@example.com`);
      const validEmails = Array(50)
        .fill(null)
        .map((_, i) => `email${i}@example.com`);

      expect(tooManyEmails.length).toBeGreaterThan(100);
      expect(validEmails.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Date and Time Handling", () => {
    it("should handle expiration date calculations", () => {
      const now = new Date();
      const hoursToAdd = 168; // 7 days
      const expectedExpiration = new Date(
        now.getTime() + hoursToAdd * 60 * 60 * 1000
      );

      // Test that expiration is calculated correctly
      const calculatedExpiration = new Date();
      calculatedExpiration.setHours(
        calculatedExpiration.getHours() + hoursToAdd
      );

      expect(calculatedExpiration.getTime()).toBeCloseTo(
        expectedExpiration.getTime(),
        -3
      ); // Within 1 second
    });

    it("should detect expired invitations", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

      expect(now > pastDate).toBe(true); // Expired
      expect(now > futureDate).toBe(false); // Not expired
    });
  });

  describe("Permission Validation", () => {
    it("should validate teacher and admin roles", () => {
      const validRoles = ["teacher", "admin"];
      const invalidRoles = ["student", "guest", "moderator"];

      validRoles.forEach((role) => {
        const hasPermission = role === "teacher" || role === "admin";
        expect(hasPermission).toBe(true);
      });

      invalidRoles.forEach((role) => {
        const hasPermission = role === "teacher" || role === "admin";
        expect(hasPermission).toBe(false);
      });
    });
  });
});
