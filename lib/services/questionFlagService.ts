import { supabase, SupabaseError } from "../supabaseClient";

export interface QuestionFlag {
  id: string;
  session_id: string;
  question_id: string;
  question_type: "mcq" | "saq" | "coding";
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlagQuestionRequest {
  session_id: string;
  question_id: string;
  question_type: "mcq" | "saq" | "coding";
  is_flagged: boolean;
}

/**
 * Question Flag service for managing question flagging during exams
 * Allows students to flag questions for review
 */
export class QuestionFlagService {
  /**
   * Create question_flags table if it doesn't exist
   * This would normally be done via migration, but for this implementation
   * we'll check and create if needed
   */
  private static async ensureQuestionFlagsTable(): Promise<void> {
    try {
      // Try to select from the table to see if it exists
      const { error } = await supabase
        .from("question_flags")
        .select("id")
        .limit(1);

      if (error && error.code === "42P01") {
        // Table doesn't exist, create it
        // Note: In a real application, this would be done via database migrations
        console.warn(
          "question_flags table doesn't exist. This should be created via database migration."
        );
      }
    } catch (error) {
      console.error("Error checking question_flags table:", error);
    }
  }

  /**
   * Verify session ownership
   */
  private static async verifySessionOwnership(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (error || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_ACCESS_DENIED"
        );
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify session ownership",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Flag or unflag a question
   */
  static async flagQuestion(
    userId: string,
    flagData: FlagQuestionRequest
  ): Promise<QuestionFlag> {
    try {
      await this.ensureQuestionFlagsTable();

      // Verify session ownership
      await this.verifySessionOwnership(userId, flagData.session_id);

      // Check if flag already exists
      const { data: existingFlag, error: fetchError } = await supabase
        .from("question_flags")
        .select("*")
        .eq("session_id", flagData.session_id)
        .eq("question_id", flagData.question_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new SupabaseError(fetchError.message, "FLAG_FETCH_ERROR");
      }

      let flag: QuestionFlag;

      if (existingFlag) {
        // Update existing flag
        const { data: updatedFlag, error: updateError } = await supabase
          .from("question_flags")
          .update({
            is_flagged: flagData.is_flagged,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFlag.id)
          .select()
          .single();

        if (updateError) {
          throw new SupabaseError(updateError.message, "FLAG_UPDATE_ERROR");
        }

        flag = updatedFlag;
      } else {
        // Create new flag
        const { data: newFlag, error: createError } = await supabase
          .from("question_flags")
          .insert({
            session_id: flagData.session_id,
            question_id: flagData.question_id,
            question_type: flagData.question_type,
            is_flagged: flagData.is_flagged,
          })
          .select()
          .single();

        if (createError) {
          throw new SupabaseError(createError.message, "FLAG_CREATE_ERROR");
        }

        flag = newFlag;
      }

      return flag;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to flag question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get all flagged questions for a session
   */
  static async getFlaggedQuestions(
    userId: string,
    sessionId: string
  ): Promise<QuestionFlag[]> {
    try {
      await this.ensureQuestionFlagsTable();

      // Verify session ownership
      await this.verifySessionOwnership(userId, sessionId);

      const { data: flags, error } = await supabase
        .from("question_flags")
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_flagged", true)
        .order("created_at", { ascending: true });

      if (error) {
        throw new SupabaseError(error.message, "FLAGS_FETCH_ERROR");
      }

      return flags || [];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get flagged questions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get flag status for a specific question
   */
  static async getQuestionFlagStatus(
    userId: string,
    sessionId: string,
    questionId: string
  ): Promise<boolean> {
    try {
      await this.ensureQuestionFlagsTable();

      // Verify session ownership
      await this.verifySessionOwnership(userId, sessionId);

      const { data: flag, error } = await supabase
        .from("question_flags")
        .select("is_flagged")
        .eq("session_id", sessionId)
        .eq("question_id", questionId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new SupabaseError(error.message, "FLAG_STATUS_ERROR");
      }

      return flag?.is_flagged || false;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get question flag status",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Clear all flags for a session (used when exam is submitted)
   */
  static async clearSessionFlags(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      await this.ensureQuestionFlagsTable();

      // Verify session ownership
      await this.verifySessionOwnership(userId, sessionId);

      const { error } = await supabase
        .from("question_flags")
        .delete()
        .eq("session_id", sessionId);

      if (error) {
        throw new SupabaseError(error.message, "FLAGS_CLEAR_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to clear session flags",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get flag statistics for a session
   */
  static async getFlagStatistics(
    userId: string,
    sessionId: string
  ): Promise<{
    total_flagged: number;
    mcq_flagged: number;
    saq_flagged: number;
    coding_flagged: number;
  }> {
    try {
      await this.ensureQuestionFlagsTable();

      // Verify session ownership
      await this.verifySessionOwnership(userId, sessionId);

      const { data: flags, error } = await supabase
        .from("question_flags")
        .select("question_type")
        .eq("session_id", sessionId)
        .eq("is_flagged", true);

      if (error) {
        throw new SupabaseError(error.message, "FLAG_STATS_ERROR");
      }

      const stats = {
        total_flagged: flags?.length || 0,
        mcq_flagged:
          flags?.filter((f) => f.question_type === "mcq").length || 0,
        saq_flagged:
          flags?.filter((f) => f.question_type === "saq").length || 0,
        coding_flagged:
          flags?.filter((f) => f.question_type === "coding").length || 0,
      };

      return stats;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get flag statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }
}
