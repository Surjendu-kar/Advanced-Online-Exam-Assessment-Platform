import { supabase, SupabaseError } from "../supabaseClient";
import { ExamSessionService } from "./examSessionService";

export interface TimerInfo {
  session_id: string;
  exam_id: string;
  user_id: string;
  start_time: string;
  duration_minutes: number;
  time_remaining_seconds: number;
  is_expired: boolean;
}

/**
 * Exam Timer service for managing exam timing and auto-submission
 * Handles time calculations and automatic exam submission when time expires
 */
export class ExamTimerService {
  /**
   * Get timer information for an exam session
   */
  static async getTimerInfo(
    userId: string,
    sessionId: string
  ): Promise<TimerInfo> {
    try {
      // Get session and exam details
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select(
          `
          *,
          exams!inner(duration)
        `
        )
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_NOT_FOUND"
        );
      }

      // Calculate time remaining
      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const durationMinutes = (session as any).exams.duration;
      const durationMs = durationMinutes * 60 * 1000;
      const elapsedTime = Date.now() - sessionStartTime.getTime();
      const timeRemainingMs = Math.max(0, durationMs - elapsedTime);
      const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);
      const isExpired = timeRemainingMs <= 0;

      // If time has expired and session is still active, auto-submit
      if (isExpired && session.status === "in_progress") {
        await ExamSessionService.autoSubmitExam(sessionId);
      }

      return {
        session_id: session.id,
        exam_id: session.exam_id,
        user_id: session.user_id,
        start_time: session.start_time || session.created_at,
        duration_minutes: durationMinutes,
        time_remaining_seconds: timeRemainingSeconds,
        is_expired: isExpired,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get timer information",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Check if exam session has expired
   */
  static async checkSessionExpiry(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      const timerInfo = await this.getTimerInfo(userId, sessionId);
      return timerInfo.is_expired;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to check session expiry",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get time remaining in a human-readable format
   */
  static formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) {
      return "00:00:00";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  /**
   * Calculate time warnings (e.g., when 10 minutes, 5 minutes, 1 minute remaining)
   */
  static getTimeWarnings(seconds: number): {
    warning_type: "critical" | "warning" | "info" | null;
    message: string | null;
  } {
    if (seconds <= 0) {
      return {
        warning_type: "critical",
        message: "Time has expired! Exam will be auto-submitted.",
      };
    }

    if (seconds <= 60) {
      return {
        warning_type: "critical",
        message: "Less than 1 minute remaining!",
      };
    }

    if (seconds <= 300) {
      return {
        warning_type: "warning",
        message: "5 minutes remaining. Please review your answers.",
      };
    }

    if (seconds <= 600) {
      return {
        warning_type: "info",
        message: "10 minutes remaining.",
      };
    }

    return {
      warning_type: null,
      message: null,
    };
  }

  /**
   * Extend exam time (admin/teacher function)
   * This would be used in special circumstances
   */
  static async extendExamTime(
    adminUserId: string,
    sessionId: string,
    additionalMinutes: number
  ): Promise<void> {
    try {
      // Verify admin/teacher permissions
      const { data: adminProfile, error: adminError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", adminUserId)
        .single();

      if (adminError || !adminProfile) {
        throw new SupabaseError("Admin profile not found", "ADMIN_NOT_FOUND");
      }

      if (!["admin", "teacher"].includes(adminProfile.role)) {
        throw new SupabaseError(
          "Insufficient permissions",
          "INSUFFICIENT_PERMISSIONS"
        );
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select(
          `
          *,
          exams!inner(created_by)
        `
        )
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        throw new SupabaseError("Session not found", "SESSION_NOT_FOUND");
      }

      // Check if admin is the exam creator (for teachers)
      if (
        adminProfile.role === "teacher" &&
        (session as any).exams.created_by !== adminUserId
      ) {
        throw new SupabaseError(
          "Can only extend time for your own exams",
          "EXAM_ACCESS_DENIED"
        );
      }

      // Validate additional minutes
      if (additionalMinutes <= 0 || additionalMinutes > 120) {
        throw new SupabaseError(
          "Additional time must be between 1 and 120 minutes",
          "INVALID_TIME_EXTENSION"
        );
      }

      // Update exam duration
      const { error: updateError } = await supabase
        .from("exams")
        .update({
          duration: supabase.raw(`duration + ${additionalMinutes}`),
        })
        .eq("id", session.exam_id);

      if (updateError) {
        throw new SupabaseError(updateError.message, "TIME_EXTENSION_ERROR");
      }

      // Log the time extension (could be added to a separate audit table)
      console.log(
        `Exam time extended by ${additionalMinutes} minutes for session ${sessionId} by admin ${adminUserId}`
      );
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to extend exam time",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get active sessions that are about to expire (for monitoring)
   */
  static async getExpiringSessionsForExam(
    examId: string,
    warningMinutes: number = 5
  ): Promise<
    {
      session_id: string;
      user_id: string;
      time_remaining_seconds: number;
    }[]
  > {
    try {
      // Get exam duration
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("duration")
        .eq("id", examId)
        .single();

      if (examError || !exam) {
        throw new SupabaseError("Exam not found", "EXAM_NOT_FOUND");
      }

      // Get active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("exam_sessions")
        .select("id, user_id, start_time, created_at")
        .eq("exam_id", examId)
        .eq("status", "in_progress");

      if (sessionsError) {
        throw new SupabaseError(sessionsError.message, "SESSIONS_FETCH_ERROR");
      }

      if (!sessions || sessions.length === 0) {
        return [];
      }

      const warningThresholdMs = warningMinutes * 60 * 1000;
      const examDurationMs = exam.duration * 60 * 1000;
      const now = Date.now();

      const expiringSessions = sessions
        .map((session) => {
          const startTime = new Date(session.start_time || session.created_at);
          const elapsedTime = now - startTime.getTime();
          const timeRemainingMs = examDurationMs - elapsedTime;
          const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);

          return {
            session_id: session.id,
            user_id: session.user_id,
            time_remaining_seconds: timeRemainingSeconds,
            time_remaining_ms: timeRemainingMs,
          };
        })
        .filter(
          (session) =>
            session.time_remaining_ms > 0 &&
            session.time_remaining_ms <= warningThresholdMs
        )
        .map(({ time_remaining_ms, ...session }) => session);

      return expiringSessions;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get expiring sessions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Auto-submit all expired sessions for an exam
   */
  static async autoSubmitExpiredSessions(examId: string): Promise<number> {
    try {
      // Get exam duration
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("duration")
        .eq("id", examId)
        .single();

      if (examError || !exam) {
        throw new SupabaseError("Exam not found", "EXAM_NOT_FOUND");
      }

      // Get active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("exam_sessions")
        .select("id, start_time, created_at")
        .eq("exam_id", examId)
        .eq("status", "in_progress");

      if (sessionsError) {
        throw new SupabaseError(sessionsError.message, "SESSIONS_FETCH_ERROR");
      }

      if (!sessions || sessions.length === 0) {
        return 0;
      }

      const examDurationMs = exam.duration * 60 * 1000;
      const now = Date.now();

      const expiredSessions = sessions.filter((session) => {
        const startTime = new Date(session.start_time || session.created_at);
        const elapsedTime = now - startTime.getTime();
        return elapsedTime > examDurationMs;
      });

      // Auto-submit expired sessions
      let submittedCount = 0;
      for (const session of expiredSessions) {
        try {
          await ExamSessionService.autoSubmitExam(session.id);
          submittedCount++;
        } catch (error) {
          console.error(`Failed to auto-submit session ${session.id}:`, error);
        }
      }

      return submittedCount;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to auto-submit expired sessions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
