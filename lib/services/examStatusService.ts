import { supabase, SupabaseError } from "../supabaseClient";
import { Exam, ExamSession } from "../../types/database";

export interface ExamStatusInfo {
  status: "upcoming" | "active" | "completed" | "expired";
  canJoin: boolean;
  canStart: boolean;
  timeUntilStart?: number;
  timeUntilEnd?: number;
  timeRemaining?: number;
  message: string;
}

/**
 * Service for managing exam status and timing
 */
export class ExamStatusService {
  /**
   * Get comprehensive exam status information
   */
  static getExamStatus(
    exam: Exam,
    session?: ExamSession,
    currentTime: Date = new Date()
  ): ExamStatusInfo {
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    const now = currentTime;

    // Check if exam has ended
    if (now > endTime) {
      return {
        status: "expired",
        canJoin: false,
        canStart: false,
        message: "This exam has ended and is no longer available.",
      };
    }

    // Check if exam hasn't started yet
    if (now < startTime) {
      const timeUntilStart = startTime.getTime() - now.getTime();
      return {
        status: "upcoming",
        canJoin: false,
        canStart: false,
        timeUntilStart,
        message: `This exam will start ${this.formatTimeRemaining(
          timeUntilStart
        )}.`,
      };
    }

    // Exam is within the time window
    const timeUntilEnd = endTime.getTime() - now.getTime();

    // Check session status
    if (session) {
      if (session.status === "completed") {
        return {
          status: "completed",
          canJoin: false,
          canStart: false,
          message: "You have already completed this exam.",
        };
      }

      if (session.status === "terminated") {
        return {
          status: "completed",
          canJoin: false,
          canStart: false,
          message: "Your exam session was terminated due to violations.",
        };
      }

      if (session.status === "in_progress") {
        // Check if session has timed out
        if (session.start_time) {
          const sessionStart = new Date(session.start_time);
          const sessionEnd = new Date(
            sessionStart.getTime() + exam.duration * 60000
          );

          if (now > sessionEnd) {
            return {
              status: "completed",
              canJoin: false,
              canStart: false,
              message: "Your exam time has expired.",
            };
          }

          const timeRemaining = sessionEnd.getTime() - now.getTime();
          return {
            status: "active",
            canJoin: true,
            canStart: false,
            timeRemaining,
            timeUntilEnd,
            message: `You have ${this.formatTimeRemaining(
              timeRemaining
            )} remaining.`,
          };
        }
      }

      if (session.status === "not_started") {
        return {
          status: "active",
          canJoin: true,
          canStart: true,
          timeUntilEnd,
          message: "You can start this exam now.",
        };
      }
    }

    // No session exists, exam is active
    return {
      status: "active",
      canJoin: true,
      canStart: true,
      timeUntilEnd,
      message: "This exam is available. You can join now.",
    };
  }

  /**
   * Format time remaining in a human-readable format
   */
  static formatTimeRemaining(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} and ${hours} hour${
        hours !== 1 ? "s" : ""
      }`;
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} and ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }`;
    }

    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} and ${seconds} second${
        seconds !== 1 ? "s" : ""
      }`;
    }

    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  /**
   * Format time remaining for display (shorter format)
   */
  static formatTimeRemainingShort(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Check if exam session should be auto-completed due to timeout
   */
  static async checkAndCompleteExpiredSessions(): Promise<void> {
    try {
      const now = new Date();

      // Find sessions that should be completed
      const { data: expiredSessions, error: fetchError } = await supabase
        .from("exam_sessions")
        .select(
          `
          id,
          start_time,
          exams (duration)
        `
        )
        .eq("status", "in_progress")
        .not("start_time", "is", null);

      if (fetchError) {
        throw new SupabaseError(fetchError.message, "FETCH_SESSIONS_ERROR");
      }

      if (!expiredSessions || expiredSessions.length === 0) {
        return;
      }

      const sessionsToComplete = expiredSessions.filter((session) => {
        if (!session.start_time || !session.exams) return false;

        const sessionStart = new Date(session.start_time);
        const sessionEnd = new Date(
          sessionStart.getTime() + session.exams.duration * 60000
        );

        return now > sessionEnd;
      });

      if (sessionsToComplete.length === 0) {
        return;
      }

      // Complete expired sessions
      const sessionIds = sessionsToComplete.map((s) => s.id);
      const { error: updateError } = await supabase
        .from("exam_sessions")
        .update({
          status: "completed",
          end_time: now.toISOString(),
        })
        .in("id", sessionIds);

      if (updateError) {
        throw new SupabaseError(updateError.message, "UPDATE_SESSIONS_ERROR");
      }

      console.log(
        `Auto-completed ${sessionsToComplete.length} expired exam sessions`
      );
    } catch (error) {
      console.error("Failed to check and complete expired sessions:", error);
      // Don't throw error to avoid breaking other operations
    }
  }

  /**
   * Get exam timing information
   */
  static getExamTiming(exam: Exam): {
    startTime: Date;
    endTime: Date;
    duration: number;
    isActive: boolean;
    hasStarted: boolean;
    hasEnded: boolean;
  } {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);

    return {
      startTime,
      endTime,
      duration: exam.duration,
      isActive: now >= startTime && now <= endTime,
      hasStarted: now >= startTime,
      hasEnded: now > endTime,
    };
  }

  /**
   * Calculate session time remaining
   */
  static getSessionTimeRemaining(
    session: ExamSession,
    exam: Exam,
    currentTime: Date = new Date()
  ): number | null {
    if (!session.start_time || session.status !== "in_progress") {
      return null;
    }

    const sessionStart = new Date(session.start_time);
    const sessionEnd = new Date(sessionStart.getTime() + exam.duration * 60000);
    const timeRemaining = sessionEnd.getTime() - currentTime.getTime();

    return Math.max(0, timeRemaining);
  }

  /**
   * Check if student can access exam based on access type
   */
  static async canStudentAccessExam(
    studentEmail: string,
    exam: Exam
  ): Promise<boolean> {
    try {
      if (exam.access_type === "open") {
        return true;
      }

      if (exam.access_type === "invitation") {
        const { data: invitation } = await supabase
          .from("student_invitations")
          .select("id")
          .eq("exam_id", exam.id)
          .eq("student_email", studentEmail)
          .eq("status", "accepted")
          .single();

        return !!invitation;
      }

      // For code-based access, we can't determine without the code
      // This should be checked when the student provides the code
      return exam.access_type === "code";
    } catch (error) {
      console.error("Error checking student exam access:", error);
      return false;
    }
  }

  /**
   * Get exam access requirements
   */
  static getExamAccessRequirements(exam: Exam): {
    requiresInvitation: boolean;
    requiresCode: boolean;
    requiresWebcam: boolean;
    maxViolations: number;
  } {
    return {
      requiresInvitation: exam.access_type === "invitation",
      requiresCode: exam.access_type === "code",
      requiresWebcam: exam.require_webcam,
      maxViolations: exam.max_violations,
    };
  }
}
