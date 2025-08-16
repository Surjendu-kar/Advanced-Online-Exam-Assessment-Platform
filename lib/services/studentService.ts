import { supabase, SupabaseError } from "../supabaseClient";
import {
  StudentInvitation,
  Exam,
  ExamSession,
  AuthUser,
} from "../../types/database";
import { AuthService } from "../auth";

export interface InvitationLinkData {
  token: string;
  examId?: string;
  studentEmail: string;
}

export interface ExamAccessValidation {
  canAccess: boolean;
  reason?: string;
  exam?: Exam;
  session?: ExamSession;
}

export interface StudentExamListItem extends Exam {
  session?: ExamSession;
  status: "upcoming" | "active" | "completed" | "missed";
  timeRemaining?: number;
}

export interface ExamJoinRequest {
  examCode?: string;
  invitationToken?: string;
}

/**
 * Student service for handling student registration, exam access, and exam listing
 */
export class StudentService {
  /**
   * Handle invitation link and auto-register student
   */
  static async handleInvitationLink(token: string): Promise<{
    user: AuthUser;
    exam?: Exam;
    redirectTo: string;
  }> {
    try {
      // Find invitation by token
      const { data: invitation, error: invitationError } = await supabase
        .from("student_invitations")
        .select(
          `
          *,
          exams (*)
        `
        )
        .eq("invitation_token", token)
        .eq("status", "pending")
        .single();

      if (invitationError || !invitation) {
        throw new SupabaseError(
          "Invalid or expired invitation link",
          "INVALID_INVITATION"
        );
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await supabase
          .from("student_invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id);

        throw new SupabaseError(
          "Invitation link has expired",
          "INVITATION_EXPIRED"
        );
      }

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(
        invitation.student_email
      );

      let user: AuthUser;

      if (existingUser.user) {
        // User exists, just get their profile
        const profile = await AuthService.getUserProfile(existingUser.user.id);
        user = {
          ...existingUser.user,
          profile,
        };

        // If user is not a student, update their role
        if (profile?.role !== "student") {
          await AuthService.updateUserProfile(existingUser.user.id, {
            role: "student",
          });
          user.profile = { ...profile, role: "student" };
        }
      } else {
        // Create new user account
        const tempPassword = this.generateTempPassword();

        const { data: newUserData, error: createError } =
          await supabase.auth.admin.createUser({
            email: invitation.student_email,
            password: tempPassword,
            email_confirm: true,
          });

        if (createError || !newUserData.user) {
          throw new SupabaseError(
            "Failed to create student account",
            "USER_CREATE_ERROR"
          );
        }

        // Create user profile
        const profile = await AuthService.createUserProfile(
          newUserData.user.id,
          {
            role: "student",
            created_by: invitation.teacher_id,
            verified: true,
          }
        );

        user = {
          ...newUserData.user,
          profile,
        };
      }

      // Mark invitation as accepted
      await supabase
        .from("student_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      // Determine redirect path
      let redirectTo = "/student/exams";
      if (invitation.exam_id) {
        redirectTo = `/exam/${
          invitation.exams?.exam_code || invitation.exam_id
        }`;
      }

      return {
        user,
        exam: invitation.exams,
        redirectTo,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to process invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Validate exam access for a student
   */
  static async validateExamAccess(
    userId: string,
    examId: string
  ): Promise<ExamAccessValidation> {
    try {
      // Get exam details
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .eq("is_published", true)
        .single();

      if (examError || !exam) {
        return {
          canAccess: false,
          reason: "Exam not found or not published",
        };
      }

      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);

      // Check if exam is within time window
      if (now < startTime) {
        return {
          canAccess: false,
          reason: "Exam has not started yet",
          exam,
        };
      }

      if (now > endTime) {
        return {
          canAccess: false,
          reason: "Exam has ended",
          exam,
        };
      }

      // Check existing session
      const { data: existingSession } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("exam_id", examId)
        .eq("user_id", userId)
        .single();

      if (existingSession) {
        if (existingSession.status === "completed") {
          return {
            canAccess: false,
            reason: "Exam already completed",
            exam,
            session: existingSession,
          };
        }

        if (existingSession.status === "terminated") {
          return {
            canAccess: false,
            reason: "Exam access was terminated due to violations",
            exam,
            session: existingSession,
          };
        }

        // Check if session has timed out
        if (existingSession.start_time) {
          const sessionStart = new Date(existingSession.start_time);
          const sessionEnd = new Date(
            sessionStart.getTime() + exam.duration * 60000
          );

          if (now > sessionEnd) {
            // Auto-complete timed out session
            await supabase
              .from("exam_sessions")
              .update({
                status: "completed",
                end_time: sessionEnd.toISOString(),
              })
              .eq("id", existingSession.id);

            return {
              canAccess: false,
              reason: "Exam time has expired",
              exam,
              session: { ...existingSession, status: "completed" },
            };
          }
        }

        return {
          canAccess: true,
          exam,
          session: existingSession,
        };
      }

      // Check access type and permissions
      if (exam.access_type === "invitation") {
        // Check if student has valid invitation
        const { data: invitation } = await supabase
          .from("student_invitations")
          .select("*")
          .eq("exam_id", examId)
          .eq("student_email", (await AuthService.getCurrentUser())?.email)
          .eq("status", "accepted")
          .single();

        if (!invitation) {
          return {
            canAccess: false,
            reason: "You are not invited to this exam",
            exam,
          };
        }
      }

      return {
        canAccess: true,
        exam,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to validate exam access",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Join exam with code or invitation
   */
  static async joinExam(
    userId: string,
    joinRequest: ExamJoinRequest
  ): Promise<ExamSession> {
    try {
      let exam: Exam | null = null;

      if (joinRequest.examCode) {
        // Find exam by code
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .select("*")
          .eq("exam_code", joinRequest.examCode.toUpperCase())
          .eq("is_published", true)
          .single();

        if (examError || !examData) {
          throw new SupabaseError("Invalid exam code", "INVALID_EXAM_CODE");
        }

        exam = examData;
      } else if (joinRequest.invitationToken) {
        // Find exam by invitation token
        const { data: invitation, error: invitationError } = await supabase
          .from("student_invitations")
          .select(
            `
            *,
            exams (*)
          `
          )
          .eq("invitation_token", joinRequest.invitationToken)
          .eq("status", "accepted")
          .single();

        if (invitationError || !invitation || !invitation.exams) {
          throw new SupabaseError(
            "Invalid invitation token",
            "INVALID_INVITATION"
          );
        }

        exam = invitation.exams;
      } else {
        throw new SupabaseError(
          "Either exam code or invitation token is required",
          "MISSING_JOIN_DATA"
        );
      }

      if (!exam) {
        throw new SupabaseError("Exam not found", "EXAM_NOT_FOUND");
      }

      // Validate access
      const validation = await this.validateExamAccess(userId, exam.id);
      if (!validation.canAccess) {
        throw new SupabaseError(
          validation.reason || "Access denied",
          "ACCESS_DENIED"
        );
      }

      // Return existing session if available
      if (validation.session) {
        return validation.session;
      }

      // Create new exam session
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .insert({
          exam_id: exam.id,
          user_id: userId,
          status: "not_started",
        })
        .select()
        .single();

      if (sessionError) {
        throw new SupabaseError(
          "Failed to create exam session",
          "SESSION_CREATE_ERROR"
        );
      }

      return session;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to join exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Start exam session
   */
  static async startExamSession(
    userId: string,
    sessionId: string
  ): Promise<ExamSession> {
    try {
      // Verify session ownership
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_NOT_FOUND"
        );
      }

      if (session.status !== "not_started") {
        throw new SupabaseError(
          "Session has already been started",
          "SESSION_ALREADY_STARTED"
        );
      }

      // Validate exam access again
      const validation = await this.validateExamAccess(userId, session.exam_id);
      if (!validation.canAccess) {
        throw new SupabaseError(
          validation.reason || "Access denied",
          "ACCESS_DENIED"
        );
      }

      // Start session
      const { data: updatedSession, error: updateError } = await supabase
        .from("exam_sessions")
        .update({
          status: "in_progress",
          start_time: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(
          "Failed to start exam session",
          "SESSION_START_ERROR"
        );
      }

      return updatedSession;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to start exam session",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get student's exam list with status
   */
  static async getStudentExams(
    userId: string,
    filters?: {
      status?: "upcoming" | "active" | "completed" | "missed";
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<StudentExamListItem[]> {
    try {
      const now = new Date();

      // Get all exams the student has access to
      let query = supabase
        .from("exams")
        .select(
          `
          *,
          exam_sessions!inner (*)
        `
        )
        .eq("is_published", true)
        .eq("exam_sessions.user_id", userId);

      // Also get exams from invitations
      const { data: invitedExams } = await supabase
        .from("student_invitations")
        .select(
          `
          exams (*),
          exam_sessions (*)
        `
        )
        .eq("student_email", (await AuthService.getCurrentUser())?.email)
        .eq("status", "accepted")
        .not("exams", "is", null);

      // Combine and process exams
      const allExams: StudentExamListItem[] = [];

      // Process session-based exams
      if (query) {
        const { data: sessionExams } = await query;
        if (sessionExams) {
          for (const exam of sessionExams) {
            const session = exam.exam_sessions[0];
            const examItem = this.processExamStatus(exam, session, now);
            allExams.push(examItem);
          }
        }
      }

      // Process invitation-based exams
      if (invitedExams) {
        for (const invitation of invitedExams) {
          if (invitation.exams) {
            const session = invitation.exam_sessions?.[0];
            const examItem = this.processExamStatus(
              invitation.exams,
              session,
              now
            );

            // Avoid duplicates
            if (!allExams.find((e) => e.id === examItem.id)) {
              allExams.push(examItem);
            }
          }
        }
      }

      // Apply filters
      let filteredExams = allExams;

      if (filters?.status) {
        filteredExams = filteredExams.filter(
          (exam) => exam.status === filters.status
        );
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredExams = filteredExams.filter(
          (exam) =>
            exam.title.toLowerCase().includes(searchTerm) ||
            exam.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by start time
      filteredExams.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Apply pagination
      if (filters?.offset || filters?.limit) {
        const start = filters.offset || 0;
        const end = start + (filters.limit || 10);
        filteredExams = filteredExams.slice(start, end);
      }

      return filteredExams;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get student exams",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Process exam status based on timing and session
   */
  private static processExamStatus(
    exam: Exam,
    session: ExamSession | undefined,
    now: Date
  ): StudentExamListItem {
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);

    let status: "upcoming" | "active" | "completed" | "missed";
    let timeRemaining: number | undefined;

    if (session?.status === "completed" || session?.status === "terminated") {
      status = "completed";
    } else if (now > endTime) {
      status = "missed";
    } else if (now < startTime) {
      status = "upcoming";
    } else {
      status = "active";

      // Calculate time remaining
      if (session?.start_time) {
        const sessionStart = new Date(session.start_time);
        const sessionEnd = new Date(
          sessionStart.getTime() + exam.duration * 60000
        );
        timeRemaining = Math.max(0, sessionEnd.getTime() - now.getTime());
      } else {
        timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
      }
    }

    return {
      ...exam,
      session,
      status,
      timeRemaining,
    };
  }

  /**
   * Generate temporary password for new student accounts
   */
  private static generateTempPassword(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get exam session by ID
   */
  static async getExamSession(
    userId: string,
    sessionId: string
  ): Promise<ExamSession | null> {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new SupabaseError(error.message, "SESSION_FETCH_ERROR");
      }

      return session;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get exam session",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
