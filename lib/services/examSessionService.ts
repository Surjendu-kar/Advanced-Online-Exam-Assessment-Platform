import { supabase, SupabaseError } from "../supabaseClient";
import { ExamSession, MCQQuestion, Exam } from "../../types/database";

export interface StartExamSessionRequest {
  exam_id: string;
  invitation_token?: string;
  exam_code?: string;
}

export interface ExamSessionWithQuestions extends ExamSession {
  exam: Exam;
  mcq_questions: MCQQuestion[];
  answered_questions: string[];
  flagged_questions: string[];
  time_remaining: number;
}

export interface SubmitMCQAnswerRequest {
  session_id: string;
  question_id: string;
  selected_option: number;
}

export interface FlagQuestionRequest {
  session_id: string;
  question_id: string;
  is_flagged: boolean;
}

export interface ExamProgress {
  total_questions: number;
  answered_questions: number;
  flagged_questions: number;
  time_remaining: number;
  current_question: number;
}

/**
 * Exam Session service for managing student exam sessions
 * Handles exam taking, answer submission, and progress tracking
 */
export class ExamSessionService {
  /**
   * Validate exam access and timing
   */
  private static async validateExamAccess(
    userId: string,
    examId: string,
    invitationToken?: string,
    examCode?: string
  ): Promise<Exam> {
    try {
      // Get exam details
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .eq("is_published", true)
        .single();

      if (examError || !exam) {
        throw new SupabaseError(
          "Exam not found or not published",
          "EXAM_NOT_FOUND"
        );
      }

      // Check exam timing
      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);

      if (now < startTime) {
        throw new SupabaseError("Exam has not started yet", "EXAM_NOT_STARTED");
      }

      if (now > endTime) {
        throw new SupabaseError("Exam has ended", "EXAM_ENDED");
      }

      // Validate access based on exam type
      if (exam.access_type === "invitation") {
        if (!invitationToken) {
          throw new SupabaseError(
            "Invitation token required",
            "INVITATION_REQUIRED"
          );
        }

        // Check invitation
        const { data: invitation, error: invitationError } = await supabase
          .from("student_invitations")
          .select("*")
          .eq("invitation_token", invitationToken)
          .eq("exam_id", examId)
          .eq("status", "accepted")
          .single();

        if (invitationError || !invitation) {
          throw new SupabaseError(
            "Invalid or expired invitation",
            "INVALID_INVITATION"
          );
        }

        // Check if invitation has expired
        if (new Date() > new Date(invitation.expires_at)) {
          throw new SupabaseError(
            "Invitation has expired",
            "INVITATION_EXPIRED"
          );
        }
      } else if (exam.access_type === "code") {
        if (!examCode || examCode !== exam.exam_code) {
          throw new SupabaseError("Invalid exam code", "INVALID_EXAM_CODE");
        }
      }
      // For "open" access type, no additional validation needed

      return exam;
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
   * Start a new exam session
   */
  static async startExamSession(
    userId: string,
    sessionData: StartExamSessionRequest
  ): Promise<ExamSessionWithQuestions> {
    try {
      // Validate exam access
      const exam = await this.validateExamAccess(
        userId,
        sessionData.exam_id,
        sessionData.invitation_token,
        sessionData.exam_code
      );

      // Check if user already has a session for this exam
      const { data: existingSession, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("exam_id", sessionData.exam_id)
        .eq("user_id", userId)
        .single();

      if (sessionError && sessionError.code !== "PGRST116") {
        throw new SupabaseError(sessionError.message, "SESSION_CHECK_ERROR");
      }

      let session: ExamSession;

      if (existingSession) {
        // Check if session is already completed
        if (existingSession.status === "completed") {
          throw new SupabaseError(
            "Exam already completed",
            "EXAM_ALREADY_COMPLETED"
          );
        }

        // Check if session is terminated
        if (existingSession.status === "terminated") {
          throw new SupabaseError(
            "Exam session was terminated",
            "EXAM_TERMINATED"
          );
        }

        // Resume existing session
        session = existingSession;

        // Update session to in_progress if it was not_started
        if (session.status === "not_started") {
          const { data: updatedSession, error: updateError } = await supabase
            .from("exam_sessions")
            .update({
              status: "in_progress",
              start_time: new Date().toISOString(),
            })
            .eq("id", session.id)
            .select()
            .single();

          if (updateError) {
            throw new SupabaseError(
              updateError.message,
              "SESSION_UPDATE_ERROR"
            );
          }

          session = updatedSession;
        }
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("exam_sessions")
          .insert({
            exam_id: sessionData.exam_id,
            user_id: userId,
            status: "in_progress",
            start_time: new Date().toISOString(),
            total_score: 0,
            violations_count: 0,
          })
          .select()
          .single();

        if (createError) {
          throw new SupabaseError(createError.message, "SESSION_CREATE_ERROR");
        }

        session = newSession;

        // Create user-specific question records for MCQ
        await this.createUserQuestionRecords(userId, sessionData.exam_id);
      }

      // Get MCQ questions for this exam
      const { data: mcqQuestions, error: mcqError } = await supabase
        .from("mcq")
        .select("*")
        .eq("exam_id", sessionData.exam_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (mcqError) {
        throw new SupabaseError(mcqError.message, "MCQ_FETCH_ERROR");
      }

      // Calculate time remaining
      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const examDurationMs = exam.duration * 60 * 1000; // Convert minutes to milliseconds
      const elapsedTime = Date.now() - sessionStartTime.getTime();
      const timeRemaining = Math.max(0, examDurationMs - elapsedTime);

      // Get answered and flagged questions
      const answeredQuestions =
        mcqQuestions
          ?.filter(
            (q) => q.selected_option !== null && q.selected_option !== undefined
          )
          .map((q) => q.id) || [];

      // For now, we'll implement flagging as a separate table later
      // For this implementation, we'll use an empty array
      const flaggedQuestions: string[] = [];

      return {
        ...session,
        exam,
        mcq_questions: mcqQuestions || [],
        answered_questions: answeredQuestions,
        flagged_questions: flaggedQuestions,
        time_remaining: Math.floor(timeRemaining / 1000), // Return in seconds
      };
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
   * Create user-specific question records for MCQ
   */
  private static async createUserQuestionRecords(
    userId: string,
    examId: string
  ): Promise<void> {
    try {
      // Get template MCQ questions
      const { data: templateQuestions, error: templateError } = await supabase
        .from("mcq")
        .select("*")
        .eq("exam_id", examId)
        .is("user_id", null);

      if (templateError) {
        throw new SupabaseError(templateError.message, "TEMPLATE_FETCH_ERROR");
      }

      if (!templateQuestions || templateQuestions.length === 0) {
        return; // No MCQ questions in this exam
      }

      // Create user-specific records
      const userQuestions = templateQuestions.map((q) => ({
        exam_id: examId,
        user_id: userId,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        marks: q.marks,
        selected_option: null,
        is_correct: null,
        marks_obtained: null,
      }));

      const { error: insertError } = await supabase
        .from("mcq")
        .insert(userQuestions);

      if (insertError) {
        throw new SupabaseError(
          insertError.message,
          "USER_QUESTIONS_CREATE_ERROR"
        );
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create user question records",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Submit MCQ answer
   */
  static async submitMCQAnswer(
    userId: string,
    answerData: SubmitMCQAnswerRequest
  ): Promise<MCQQuestion> {
    try {
      // Verify session ownership and status
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", answerData.session_id)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        throw new SupabaseError(
          "Session not found or access denied",
          "SESSION_NOT_FOUND"
        );
      }

      if (session.status !== "in_progress") {
        throw new SupabaseError("Session is not active", "SESSION_NOT_ACTIVE");
      }

      // Check if session has timed out
      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("duration")
        .eq("id", session.exam_id)
        .single();

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
      }

      const examDurationMs = exam.duration * 60 * 1000;
      const elapsedTime = Date.now() - sessionStartTime.getTime();

      if (elapsedTime > examDurationMs) {
        // Auto-submit the exam
        await this.autoSubmitExam(session.id);
        throw new SupabaseError("Exam time has expired", "EXAM_TIME_EXPIRED");
      }

      // Get the question to validate
      const { data: question, error: questionError } = await supabase
        .from("mcq")
        .select("*")
        .eq("id", answerData.question_id)
        .eq("user_id", userId)
        .eq("exam_id", session.exam_id)
        .single();

      if (questionError || !question) {
        throw new SupabaseError(
          "Question not found or access denied",
          "QUESTION_NOT_FOUND"
        );
      }

      // Validate selected option
      if (
        answerData.selected_option < 0 ||
        answerData.selected_option >= question.options.length
      ) {
        throw new SupabaseError("Invalid option selected", "INVALID_OPTION");
      }

      // Calculate if answer is correct
      const isCorrect = answerData.selected_option === question.correct_option;
      const marksObtained = isCorrect ? question.marks || 0 : 0;

      // Update the question with the answer
      const { data: updatedQuestion, error: updateError } = await supabase
        .from("mcq")
        .update({
          selected_option: answerData.selected_option,
          is_correct: isCorrect,
          marks_obtained: marksObtained,
        })
        .eq("id", answerData.question_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(updateError.message, "ANSWER_UPDATE_ERROR");
      }

      return updatedQuestion;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to submit MCQ answer",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get exam progress
   */
  static async getExamProgress(
    userId: string,
    sessionId: string
  ): Promise<ExamProgress> {
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

      // Get all MCQ questions for this session
      const { data: mcqQuestions, error: mcqError } = await supabase
        .from("mcq")
        .select("id, selected_option")
        .eq("exam_id", session.exam_id)
        .eq("user_id", userId);

      if (mcqError) {
        throw new SupabaseError(mcqError.message, "MCQ_FETCH_ERROR");
      }

      // Get exam duration
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("duration")
        .eq("id", session.exam_id)
        .single();

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
      }

      // Calculate progress
      const totalQuestions = mcqQuestions?.length || 0;
      const answeredQuestions =
        mcqQuestions?.filter(
          (q) => q.selected_option !== null && q.selected_option !== undefined
        ).length || 0;

      // Calculate time remaining
      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const examDurationMs = exam.duration * 60 * 1000;
      const elapsedTime = Date.now() - sessionStartTime.getTime();
      const timeRemaining = Math.max(0, examDurationMs - elapsedTime);

      return {
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        flagged_questions: 0, // TODO: Implement flagging system
        time_remaining: Math.floor(timeRemaining / 1000),
        current_question: 1, // TODO: Implement current question tracking
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get exam progress",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Submit exam (finalize the session)
   */
  static async submitExam(
    userId: string,
    sessionId: string
  ): Promise<ExamSession> {
    try {
      // Verify session ownership and status
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

      if (session.status === "completed") {
        throw new SupabaseError(
          "Exam already submitted",
          "EXAM_ALREADY_SUBMITTED"
        );
      }

      if (session.status === "terminated") {
        throw new SupabaseError(
          "Exam session was terminated",
          "EXAM_TERMINATED"
        );
      }

      // Calculate total score from MCQ answers
      const { data: mcqAnswers, error: mcqError } = await supabase
        .from("mcq")
        .select("marks_obtained")
        .eq("exam_id", session.exam_id)
        .eq("user_id", userId);

      if (mcqError) {
        throw new SupabaseError(mcqError.message, "MCQ_SCORE_FETCH_ERROR");
      }

      const totalScore =
        mcqAnswers?.reduce(
          (sum, answer) => sum + (answer.marks_obtained || 0),
          0
        ) || 0;

      // Update session status
      const { data: updatedSession, error: updateError } = await supabase
        .from("exam_sessions")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
          total_score: totalScore,
        })
        .eq("id", sessionId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        throw new SupabaseError(updateError.message, "SESSION_UPDATE_ERROR");
      }

      return updatedSession;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to submit exam", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Auto-submit exam when time expires
   */
  static async autoSubmitExam(sessionId: string): Promise<void> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        return; // Session not found, nothing to auto-submit
      }

      if (session.status === "completed" || session.status === "terminated") {
        return; // Already completed or terminated
      }

      // Calculate total score
      const { data: mcqAnswers, error: mcqError } = await supabase
        .from("mcq")
        .select("marks_obtained")
        .eq("exam_id", session.exam_id)
        .eq("user_id", session.user_id);

      if (mcqError) {
        console.error("Error fetching MCQ scores for auto-submit:", mcqError);
      }

      const totalScore =
        mcqAnswers?.reduce(
          (sum, answer) => sum + (answer.marks_obtained || 0),
          0
        ) || 0;

      // Update session to completed
      await supabase
        .from("exam_sessions")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
          total_score: totalScore,
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error in auto-submit exam:", error);
    }
  }

  /**
   * Get exam session by ID
   */
  static async getExamSession(
    userId: string,
    sessionId: string
  ): Promise<ExamSessionWithQuestions | null> {
    try {
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError) {
        if (sessionError.code === "PGRST116") {
          return null;
        }
        throw new SupabaseError(sessionError.message, "SESSION_FETCH_ERROR");
      }

      // Get exam details
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", session.exam_id)
        .single();

      if (examError) {
        throw new SupabaseError(examError.message, "EXAM_FETCH_ERROR");
      }

      // Get MCQ questions
      const { data: mcqQuestions, error: mcqError } = await supabase
        .from("mcq")
        .select("*")
        .eq("exam_id", session.exam_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (mcqError) {
        throw new SupabaseError(mcqError.message, "MCQ_FETCH_ERROR");
      }

      // Calculate time remaining
      const sessionStartTime = new Date(
        session.start_time || session.created_at
      );
      const examDurationMs = exam.duration * 60 * 1000;
      const elapsedTime = Date.now() - sessionStartTime.getTime();
      const timeRemaining = Math.max(0, examDurationMs - elapsedTime);

      // Get answered and flagged questions
      const answeredQuestions =
        mcqQuestions
          ?.filter(
            (q) => q.selected_option !== null && q.selected_option !== undefined
          )
          .map((q) => q.id) || [];

      const flaggedQuestions: string[] = []; // TODO: Implement flagging

      return {
        ...session,
        exam,
        mcq_questions: mcqQuestions || [],
        answered_questions: answeredQuestions,
        flagged_questions: flaggedQuestions,
        time_remaining: Math.floor(timeRemaining / 1000),
      };
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
