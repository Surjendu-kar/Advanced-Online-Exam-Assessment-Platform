import { supabase, SupabaseError } from "../supabaseClient";
import { SAQQuestion } from "../../types/database";

export interface SubmitSAQAnswerRequest {
  session_id: string;
  question_id: string;
  answer_text: string;
}

export interface AutoSaveSAQRequest {
  session_id: string;
  question_id: string;
  answer_text: string;
}

export interface SAQAnswerVersion {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  created_at: string;
}

export interface ReviewSAQAnswerRequest {
  session_id: string;
  question_id: string;
  answer_text?: string;
  marks_obtained?: number;
  grader_comments?: string;
}

/**
 * SAQ Exam service for handling student SAQ exam functionality
 * Manages answer submission, auto-save, versioning, and review
 */
export class SAQExamService {
  /**
   * Verify session ownership and status
   */
  private static async verifySessionAccess(
    userId: string,
    sessionId: string
  ): Promise<{ id: string; exam_id: string; status: string }> {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .select("id, exam_id, status")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (error || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_NOT_FOUND"
        );
      }

      if (session.status !== "in_progress") {
        throw new SupabaseError("Session is not active", "SESSION_NOT_ACTIVE");
      }

      return session;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify session access",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Verify question belongs to exam and is SAQ type
   */
  private static async verifySAQQuestion(
    examId: string,
    questionId: string
  ): Promise<SAQQuestion> {
    try {
      const { data: question, error } = await supabase
        .from("saq")
        .select("*")
        .eq("id", questionId)
        .eq("exam_id", examId)
        .is("user_id", null) // Template question, not user answer
        .single();

      if (error || !question) {
        throw new SupabaseError(
          "SAQ question not found or access denied",
          "QUESTION_NOT_FOUND"
        );
      }

      return question;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify SAQ question",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Check if exam time has expired
   */
  private static async checkExamTime(
    sessionId: string,
    examId: string
  ): Promise<void> {
    try {
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("start_time, created_at")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        throw new SupabaseError(sessionError.message, "SESSION_FETCH_ERROR");
      }

      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("duration")
        .eq("id", examId)
        .single();

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
      }

      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const examDurationMs = exam.duration * 60 * 1000;
      const elapsedTime = Date.now() - sessionStartTime.getTime();

      if (elapsedTime > examDurationMs) {
        // Auto-submit the exam
        await this.autoSubmitExam(sessionId);
        throw new SupabaseError("Exam time has expired", "EXAM_TIME_EXPIRED");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to check exam time",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create user-specific SAQ question record
   */
  private static async createUserSAQRecord(
    userId: string,
    examId: string,
    questionId: string
  ): Promise<SAQQuestion> {
    try {
      // Get template SAQ question
      const { data: templateQuestion, error: templateError } = await supabase
        .from("saq")
        .select("*")
        .eq("id", questionId)
        .eq("exam_id", examId)
        .is("user_id", null)
        .single();

      if (templateError || !templateQuestion) {
        throw new SupabaseError(
          "Template SAQ question not found",
          "TEMPLATE_NOT_FOUND"
        );
      }

      // Create user-specific record
      const userSAQData = {
        exam_id: examId,
        user_id: userId,
        question_text: templateQuestion.question_text,
        answer_text: null,
        answer_guidelines: templateQuestion.answer_guidelines,
        marking_criteria: templateQuestion.marking_criteria,
        marks: templateQuestion.marks,
        marks_obtained: null,
        grader_comments: null,
      };

      const { data: userSAQ, error: insertError } = await supabase
        .from("saq")
        .insert(userSAQData)
        .select()
        .single();

      if (insertError) {
        throw new SupabaseError(
          insertError.message,
          "USER_SAQ_CREATE_ERROR"
        );
      }

      return userSAQ;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create user SAQ record",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get user-specific SAQ question record
   */
  private static async getUserSAQRecord(
    userId: string,
    examId: string,
    questionId: string
  ): Promise<SAQQuestion | null> {
    try {
      const { data: userSAQ, error } = await supabase
        .from("saq")
        .select("*")
        .eq("exam_id", examId)
        .eq("user_id", userId)
        .eq("id", questionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new SupabaseError(error.message, "USER_SAQ_FETCH_ERROR");
      }

      return userSAQ;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get user SAQ record",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Submit SAQ answer
   */
  static async submitSAQAnswer(
    userId: string,
    answerData: SubmitSAQAnswerRequest
  ): Promise<SAQQuestion> {
    try {
      // Verify session ownership and status
      const session = await this.verifySessionAccess(
        userId,
        answerData.session_id
      );

      // Check if exam time has expired
      await this.checkExamTime(answerData.session_id, session.exam_id);

      // Get template SAQ question
      const templateQuestion = await this.verifySAQQuestion(
        session.exam_id,
        answerData.question_id
      );

      // Get or create user-specific SAQ record
      let userSAQ = await this.getUserSAQRecord(
        userId,
        session.exam_id,
        answerData.question_id
      );

      if (!userSAQ) {
        userSAQ = await this.createUserSAQRecord(
          userId,
          session.exam_id,
          answerData.question_id
        );
      }

      // Update the answer
      const { data: updatedSAQ, error: updateError } = await supabase
        .from("saq")
        .update({
          answer_text: answerData.answer_text.trim(),
        })
        .eq("id", userSAQ.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(updateError.message, "ANSWER_UPDATE_ERROR");
      }

      return updatedSAQ;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to submit SAQ answer",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Auto-save SAQ answer draft
   */
  static async autoSaveSAQAnswer(
    userId: string,
    saveData: AutoSaveSAQRequest
  ): Promise<SAQQuestion> {
    try {
      // Verify session ownership and status
      const session = await this.verifySessionAccess(
        userId,
        saveData.session_id
      );

      // Check if exam time has expired
      await this.checkExamTime(saveData.session_id, session.exam_id);

      // Get template SAQ question
      const templateQuestion = await this.verifySAQQuestion(
        session.exam_id,
        saveData.question_id
      );

      // Get or create user-specific SAQ record
      let userSAQ = await this.getUserSAQRecord(
        userId,
        session.exam_id,
        saveData.question_id
      );

      if (!userSAQ) {
        userSAQ = await this.createUserSAQRecord(
          userId,
          session.exam_id,
          saveData.question_id
        );
      }

      // Update the draft answer
      const { data: updatedSAQ, error: updateError } = await supabase
        .from("saq")
        .update({
          answer_text: saveData.answer_text.trim(),
        })
        .eq("id", userSAQ.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(updateError.message, "DRAFT_SAVE_ERROR");
      }

      return updatedSAQ;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to auto-save SAQ answer",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get answer versions (revision tracking)
   */
  static async getAnswerVersions(
    userId: string,
    sessionId: string,
    questionId: string
  ): Promise<SAQAnswerVersion[]> {
    try {
      // Verify session ownership
      await this.verifySessionAccess(userId, sessionId);

      // Get user-specific SAQ record
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("exam_id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError) {
        throw new SupabaseError(sessionError.message, "SESSION_FETCH_ERROR");
      }

      const { data: userSAQ, error: saqError } = await supabase
        .from("saq")
        .select("id, answer_text, created_at")
        .eq("exam_id", session.exam_id)
        .eq("user_id", userId)
        .eq("id", questionId)
        .single();

      if (saqError) {
        throw new SupabaseError(saqError.message, "USER_SAQ_FETCH_ERROR");
      }

      // For now, we're returning just the current answer as a version
      // In a more advanced implementation, we could track multiple versions
      return [
        {
          id: userSAQ.id,
          session_id: sessionId,
          question_id: questionId,
          answer_text: userSAQ.answer_text || "",
          created_at: userSAQ.created_at,
        },
      ];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get answer versions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Review and grade SAQ answer (for teachers)
   */
  static async reviewSAQAnswer(
    userId: string,
    reviewData: ReviewSAQAnswerRequest
  ): Promise<SAQQuestion> {
    try {
      // Verify session ownership (teacher access to student session)
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("exam_id, user_id")
        .eq("id", reviewData.session_id)
        .single();

      if (sessionError || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_NOT_FOUND"
        );
      }

      // Verify teacher has access to exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("created_by")
        .eq("id", session.exam_id)
        .single();

      if (examError || !exam) {
        throw new SupabaseError("Exam not found", "EXAM_NOT_FOUND");
      }

      if (exam.created_by !== userId) {
        throw new SupabaseError(
          "Access denied - not the exam creator",
          "EXAM_ACCESS_DENIED"
        );
      }

      // Get user-specific SAQ record
      const { data: userSAQ, error: saqError } = await supabase
        .from("saq")
        .select("*")
        .eq("exam_id", session.exam_id)
        .eq("user_id", session.user_id)
        .eq("id", reviewData.question_id)
        .single();

      if (saqError || !userSAQ) {
        throw new SupabaseError(
          "SAQ answer not found",
          "ANSWER_NOT_FOUND"
        );
      }

      // Prepare update data
      const updateData: any = {};
      if (reviewData.answer_text !== undefined) {
        updateData.answer_text = reviewData.answer_text;
      }
      if (reviewData.marks_obtained !== undefined) {
        updateData.marks_obtained = reviewData.marks_obtained;
      }
      if (reviewData.grader_comments !== undefined) {
        updateData.grader_comments = reviewData.grader_comments;
      }

      // Update the answer
      const { data: updatedSAQ, error: updateError } = await supabase
        .from("saq")
        .update(updateData)
        .eq("id", userSAQ.id)
        .eq("user_id", session.user_id)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(updateError.message, "ANSWER_UPDATE_ERROR");
      }

      return updatedSAQ;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to review SAQ answer",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Auto-submit exam when time expires
   */
  static async autoSubmitExam(sessionId: string): Promise<void> {
    try {
      // This would be called from the exam session service
      // For now, we're just ensuring the placeholder exists
      console.log(`Auto-submit triggered for session ${sessionId}`);
    } catch (error) {
      console.error("Error in auto-submit SAQ:", error);
    }
  }
}