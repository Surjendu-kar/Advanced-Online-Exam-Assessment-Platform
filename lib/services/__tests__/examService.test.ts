import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExamService } from "../examService";
import { supabase } from "../../supabaseClient";

// Mock Supabase client
vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
  SupabaseError: class SupabaseError extends Error {
    constructor(message: string, public code?: string, public details?: any) {
      super(message);
      this.name = "SupabaseError";
    }
  },
}));

describe("ExamService", () => {
  const mockUserId = "user-123";
  const mockExamId = "exam-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createExam", () => {
    it("should create a new exam with valid data", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const futureEndDate = new Date(
        Date.now() + 26 * 60 * 60 * 1000
      ).toISOString();

      const mockExamData = {
        title: "Test Exam",
        description: "Test Description",
        start_time: futureDate,
        end_time: futureEndDate,
        duration: 120,
        access_type: "invitation" as const,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
      };

      const mockCreatedExam = {
        id: mockExamId,
        ...mockExamData,
        created_by: mockUserId,
        total_marks: 0,
        is_published: false,
        exam_code: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCreatedExam,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await ExamService.createExam(mockUserId, mockExamData);

      expect(result).toEqual(mockCreatedExam);
      expect(supabase.from).toHaveBeenCalledWith("exams");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Exam",
          description: "Test Description",
          exam_code: null,
          created_by: mockUserId,
          duration: 120,
          total_marks: 0,
          is_published: false,
          access_type: "invitation",
          max_attempts: 1,
          shuffle_questions: false,
          show_results_immediately: false,
          require_webcam: true,
          max_violations: 3,
        })
      );
    });

    it("should throw validation error for missing title", async () => {
      const invalidExamData = {
        title: "",
        start_time: "2025-01-01T10:00:00Z",
        end_time: "2025-01-01T12:00:00Z",
        duration: 120,
        access_type: "invitation" as const,
      };

      await expect(
        ExamService.createExam(mockUserId, invalidExamData)
      ).rejects.toThrow("Exam title is required");
    });

    it("should throw validation error for invalid duration", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const futureEndDate = new Date(
        Date.now() + 26 * 60 * 60 * 1000
      ).toISOString();

      const invalidExamData = {
        title: "Test Exam",
        start_time: futureDate,
        end_time: futureEndDate,
        duration: 0,
        access_type: "invitation" as const,
      };

      await expect(
        ExamService.createExam(mockUserId, invalidExamData)
      ).rejects.toThrow("Duration must be between 1 and 480 minutes");
    });

    it("should throw validation error for start time in the past", async () => {
      const invalidExamData = {
        title: "Test Exam",
        start_time: "2020-01-01T10:00:00Z",
        end_time: "2025-01-01T12:00:00Z",
        duration: 120,
        access_type: "invitation" as const,
      };

      await expect(
        ExamService.createExam(mockUserId, invalidExamData)
      ).rejects.toThrow("Start time cannot be in the past");
    });

    it("should throw validation error for end time before start time", async () => {
      const invalidExamData = {
        title: "Test Exam",
        start_time: "2025-01-01T12:00:00Z",
        end_time: "2025-01-01T10:00:00Z",
        duration: 120,
        access_type: "invitation" as const,
      };

      await expect(
        ExamService.createExam(mockUserId, invalidExamData)
      ).rejects.toThrow("End time must be after start time");
    });

    it("should generate exam code for code access type", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const futureEndDate = new Date(
        Date.now() + 26 * 60 * 60 * 1000
      ).toISOString();

      const mockExamData = {
        title: "Test Exam",
        start_time: futureDate,
        end_time: futureEndDate,
        duration: 120,
        access_type: "code" as const,
      };

      const mockCreatedExam = {
        id: mockExamId,
        ...mockExamData,
        created_by: mockUserId,
        total_marks: 0,
        is_published: false,
        exam_code: "ABC123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock code uniqueness check
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCreatedExam,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
      });

      const result = await ExamService.createExam(mockUserId, mockExamData);

      expect(result.exam_code).toBeTruthy();
      expect(result.exam_code).toHaveLength(6);
    });
  });

  describe("getExams", () => {
    it("should fetch paginated exams for a user", async () => {
      const mockExams = [
        {
          id: "exam-1",
          title: "Exam 1",
          created_by: mockUserId,
          is_published: true,
        },
        {
          id: "exam-2",
          title: "Exam 2",
          created_by: mockUserId,
          is_published: false,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockExams,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await ExamService.getExams(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockExams);
      expect(result.count).toBe(2);
      expect(mockQuery.eq).toHaveBeenCalledWith("created_by", mockUserId);
    });

    it("should apply search filter", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await ExamService.getExams(mockUserId, {
        search: "test",
      });

      expect(mockQuery.or).toHaveBeenCalledWith(
        "title.ilike.%test%,description.ilike.%test%"
      );
    });

    it("should apply published filter", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await ExamService.getExams(mockUserId, {
        is_published: true,
      });

      expect(mockQuery.eq).toHaveBeenCalledWith("created_by", mockUserId);
      expect(mockQuery.eq).toHaveBeenCalledWith("is_published", true);
    });
  });

  describe("getExamById", () => {
    it("should fetch exam by ID for owner", async () => {
      const mockExam = {
        id: mockExamId,
        title: "Test Exam",
        created_by: mockUserId,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await ExamService.getExamById(mockUserId, mockExamId);

      expect(result).toEqual(mockExam);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", mockExamId);
      expect(mockQuery.eq).toHaveBeenCalledWith("created_by", mockUserId);
    });

    it("should return null for non-existent exam", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await ExamService.getExamById(mockUserId, mockExamId);

      expect(result).toBeNull();
    });
  });

  describe("updateExam", () => {
    it("should update exam with valid data", async () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const futureEndDate = new Date(
        Date.now() + 26 * 60 * 60 * 1000
      ).toISOString();

      const mockExistingExam = {
        id: mockExamId,
        title: "Old Title",
        created_by: mockUserId,
        start_time: futureDate,
        end_time: futureEndDate,
        duration: 120,
        access_type: "invitation",
      };

      const mockUpdatedExam = {
        ...mockExistingExam,
        title: "New Title",
      };

      // Mock getExamById
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExistingExam,
          error: null,
        }),
      };

      // Mock update
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedExam,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue({
        ...mockSelectQuery,
        ...mockUpdateQuery,
      });

      const result = await ExamService.updateExam(mockUserId, mockExamId, {
        title: "New Title",
      });

      expect(result).toEqual(mockUpdatedExam);
    });
  });

  describe("deleteExam", () => {
    it("should soft delete exam", async () => {
      const mockExam = {
        id: mockExamId,
        title: "Test Exam",
        created_by: mockUserId,
      };

      // Mock for getExamById call
      const mockExamSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
      };

      // Mock for session check
      const mockSessionQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      // Mock for update
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockUpdateQuery.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            ...mockExamSelectQuery,
            ...mockUpdateQuery,
          };
        }
        if (table === "exam_sessions") {
          return mockSessionQuery;
        }
      });

      await ExamService.deleteExam(mockUserId, mockExamId);

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        title: "[DELETED] Test Exam",
        is_published: false,
        updated_at: expect.any(String),
      });
    });

    it("should prevent deletion of exam with active sessions", async () => {
      const mockExam = {
        id: mockExamId,
        title: "Test Exam",
        created_by: mockUserId,
      };

      const mockActiveSessions = [{ id: "session-1" }];

      // Mock getExamById
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
        in: vi.fn().mockResolvedValue({
          data: mockActiveSessions,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockSelectQuery;
        }
        if (table === "exam_sessions") {
          return mockSelectQuery;
        }
      });

      await expect(
        ExamService.deleteExam(mockUserId, mockExamId)
      ).rejects.toThrow("Cannot delete exam with active sessions");
    });
  });

  describe("publishExam", () => {
    it("should publish exam with questions", async () => {
      const mockExam = {
        id: mockExamId,
        title: "Test Exam",
        created_by: mockUserId,
        is_published: false,
      };

      const mockPublishedExam = {
        ...mockExam,
        is_published: true,
        total_marks: 100,
      };

      // Mock question counts
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 5,
        }),
      };

      // Mock marks queries
      const mockMarksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [
            { marks: 20 },
            { marks: 20 },
            { marks: 20 },
            { marks: 20 },
            { marks: 20 },
          ],
          error: null,
        }),
      };

      // Mock exam queries
      const mockExamQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExam,
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      mockExamQuery.update.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPublishedExam,
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "exams") {
          return mockExamQuery;
        }
        return {
          ...mockCountQuery,
          ...mockMarksQuery,
        };
      });

      const result = await ExamService.publishExam(mockUserId, mockExamId);

      expect(result.is_published).toBe(true);
      expect(result.total_marks).toBe(100);
    });

    it("should prevent publishing exam without questions", async () => {
      // Mock zero question counts
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 0,
        }),
      };

      (supabase.from as any).mockReturnValue(mockCountQuery);

      await expect(
        ExamService.publishExam(mockUserId, mockExamId)
      ).rejects.toThrow("Cannot publish exam without questions");
    });
  });

  describe("getExamStats", () => {
    it("should return exam statistics", async () => {
      const mockExams = [
        { is_published: true, title: "Published Exam" },
        { is_published: false, title: "Draft Exam" },
        { is_published: false, title: "[ARCHIVED] Archived Exam" },
        { is_published: false, title: "[DELETED] Deleted Exam" },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockExams,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await ExamService.getExamStats(mockUserId);

      expect(result).toEqual({
        total: 4,
        published: 1,
        draft: 1,
        archived: 2, // Both archived and deleted are counted as archived
      });
    });
  });
});
