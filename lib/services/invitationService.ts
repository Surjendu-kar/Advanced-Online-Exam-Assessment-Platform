import { supabase, SupabaseError } from "../supabaseClient";
import { StudentInvitation } from "../../types/database";
import crypto from "crypto";

export interface CreateInvitationRequest {
  student_email: string;
  exam_id?: string;
  expires_in_hours?: number;
}

export interface BulkInvitationRequest {
  student_emails: string[];
  exam_id?: string;
  expires_in_hours?: number;
}

export interface GetInvitationsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentInvitation["status"];
  exam_id?: string;
}

export interface GetInvitationsResponse {
  data: StudentInvitation[];
  count: number;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}

/**
 * Student Invitation service for managing student invitations
 * Accessible by teachers and admins
 */
export class InvitationService {
  /**
   * Generate a secure invitation token
   */
  private static generateInvitationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Validate email address format
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate invitation data
   */
  private static validateInvitationData(data: CreateInvitationRequest): void {
    if (!data.student_email?.trim()) {
      throw new SupabaseError("Student email is required", "VALIDATION_ERROR");
    }

    if (!this.validateEmail(data.student_email)) {
      throw new SupabaseError("Invalid email format", "VALIDATION_ERROR");
    }

    if (
      data.expires_in_hours &&
      (data.expires_in_hours < 1 || data.expires_in_hours > 8760)
    ) {
      throw new SupabaseError(
        "Expiration time must be between 1 hour and 1 year",
        "VALIDATION_ERROR"
      );
    }

    if (data.exam_id && !data.exam_id.trim()) {
      throw new SupabaseError("Invalid exam ID", "VALIDATION_ERROR");
    }
  }

  /**
   * Verify user has permission to send invitations
   */
  private static async verifyTeacherPermission(userId: string): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        throw new SupabaseError("User profile not found", "USER_NOT_FOUND");
      }

      if (profile.role !== "teacher" && profile.role !== "admin") {
        throw new SupabaseError(
          "Only teachers and admins can send invitations",
          "PERMISSION_DENIED"
        );
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify user permissions",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Verify exam access if exam_id is provided
   */
  private static async verifyExamAccess(
    userId: string,
    examId: string
  ): Promise<void> {
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("id, created_by")
        .eq("id", examId)
        .eq("created_by", userId)
        .single();

      if (error || !exam) {
        throw new SupabaseError(
          "Exam not found or access denied",
          "EXAM_ACCESS_DENIED"
        );
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to verify exam access",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Check if student is already invited
   */
  private static async checkExistingInvitation(
    teacherId: string,
    studentEmail: string,
    examId?: string
  ): Promise<StudentInvitation | null> {
    try {
      let query = supabase
        .from("student_invitations")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("student_email", studentEmail.toLowerCase())
        .eq("status", "pending");

      if (examId) {
        query = query.eq("exam_id", examId);
      } else {
        query = query.is("exam_id", null);
      }

      const { data: invitation, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        throw new SupabaseError(error.message, "INVITATION_CHECK_ERROR");
      }

      return invitation;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to check existing invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create a new student invitation
   */
  static async createInvitation(
    teacherId: string,
    invitationData: CreateInvitationRequest
  ): Promise<StudentInvitation> {
    try {
      // Validate invitation data
      this.validateInvitationData(invitationData);

      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      // Verify exam access if exam_id is provided
      if (invitationData.exam_id) {
        await this.verifyExamAccess(teacherId, invitationData.exam_id);
      }

      // Check for existing invitation
      const existingInvitation = await this.checkExistingInvitation(
        teacherId,
        invitationData.student_email,
        invitationData.exam_id
      );

      if (existingInvitation) {
        throw new SupabaseError(
          "Student is already invited",
          "DUPLICATE_INVITATION"
        );
      }

      // Generate invitation token and expiration
      const invitationToken = this.generateInvitationToken();
      const expiresInHours = invitationData.expires_in_hours || 168; // Default 7 days
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Prepare invitation data
      const newInvitationData = {
        teacher_id: teacherId,
        student_email: invitationData.student_email.toLowerCase(),
        invitation_token: invitationToken,
        exam_id: invitationData.exam_id || null,
        status: "pending" as const,
        expires_at: expiresAt.toISOString(),
      };

      // Insert invitation
      const { data: invitation, error } = await supabase
        .from("student_invitations")
        .insert(newInvitationData)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "INVITATION_CREATE_ERROR");
      }

      return invitation;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create multiple invitations (bulk invite)
   */
  static async createBulkInvitations(
    teacherId: string,
    bulkData: BulkInvitationRequest
  ): Promise<{
    successful: StudentInvitation[];
    failed: { email: string; error: string }[];
  }> {
    try {
      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      // Verify exam access if exam_id is provided
      if (bulkData.exam_id) {
        await this.verifyExamAccess(teacherId, bulkData.exam_id);
      }

      if (!bulkData.student_emails || bulkData.student_emails.length === 0) {
        throw new SupabaseError(
          "No email addresses provided",
          "VALIDATION_ERROR"
        );
      }

      if (bulkData.student_emails.length > 100) {
        throw new SupabaseError(
          "Cannot invite more than 100 students at once",
          "VALIDATION_ERROR"
        );
      }

      const successful: StudentInvitation[] = [];
      const failed: { email: string; error: string }[] = [];

      // Process each email
      for (const email of bulkData.student_emails) {
        try {
          const invitation = await this.createInvitation(teacherId, {
            student_email: email,
            exam_id: bulkData.exam_id,
            expires_in_hours: bulkData.expires_in_hours,
          });
          successful.push(invitation);
        } catch (error) {
          failed.push({
            email,
            error:
              error instanceof SupabaseError ? error.message : "Unknown error",
          });
        }
      }

      return { successful, failed };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create bulk invitations",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get paginated list of invitations
   */
  static async getInvitations(
    teacherId: string,
    options: GetInvitationsOptions = {}
  ): Promise<GetInvitationsResponse> {
    try {
      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      const { page = 1, limit = 10, search, status, exam_id } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("student_invitations")
        .select("*", { count: "exact" })
        .eq("teacher_id", teacherId);

      // Apply filters
      if (search) {
        query = query.ilike("student_email", `%${search}%`);
      }

      if (status) {
        query = query.eq("status", status);
      }

      if (exam_id) {
        query = query.eq("exam_id", exam_id);
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: invitations, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "INVITATIONS_FETCH_ERROR");
      }

      return {
        data: invitations || [],
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch invitations",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get invitation by token
   */
  static async getInvitationByToken(
    token: string
  ): Promise<StudentInvitation | null> {
    try {
      if (!token?.trim()) {
        throw new SupabaseError(
          "Invitation token is required",
          "VALIDATION_ERROR"
        );
      }

      const { data: invitation, error } = await supabase
        .from("student_invitations")
        .select("*")
        .eq("invitation_token", token)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Invitation not found
        }
        throw new SupabaseError(error.message, "INVITATION_FETCH_ERROR");
      }

      return invitation;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Accept invitation (mark as accepted)
   */
  static async acceptInvitation(token: string): Promise<StudentInvitation> {
    try {
      // Get invitation by token
      const invitation = await this.getInvitationByToken(token);

      if (!invitation) {
        throw new SupabaseError(
          "Invalid invitation token",
          "INVITATION_NOT_FOUND"
        );
      }

      // Check if invitation is still valid
      if (invitation.status !== "pending") {
        throw new SupabaseError(
          `Invitation is already ${invitation.status}`,
          "INVITATION_INVALID_STATUS"
        );
      }

      // Check if invitation has expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);

      if (now > expiresAt) {
        // Mark as expired
        await supabase
          .from("student_invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id);

        throw new SupabaseError("Invitation has expired", "INVITATION_EXPIRED");
      }

      // Mark invitation as accepted
      const { data: updatedInvitation, error } = await supabase
        .from("student_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "INVITATION_UPDATE_ERROR");
      }

      return updatedInvitation;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to accept invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Resend invitation (generate new token and extend expiration)
   */
  static async resendInvitation(
    teacherId: string,
    invitationId: string
  ): Promise<StudentInvitation> {
    try {
      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      // Get existing invitation
      const { data: invitation, error: fetchError } = await supabase
        .from("student_invitations")
        .select("*")
        .eq("id", invitationId)
        .eq("teacher_id", teacherId)
        .single();

      if (fetchError || !invitation) {
        throw new SupabaseError(
          "Invitation not found or access denied",
          "INVITATION_NOT_FOUND"
        );
      }

      if (invitation.status === "accepted") {
        throw new SupabaseError(
          "Cannot resend accepted invitation",
          "INVITATION_ALREADY_ACCEPTED"
        );
      }

      // Generate new token and extend expiration
      const newToken = this.generateInvitationToken();
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 168); // 7 days

      // Update invitation
      const { data: updatedInvitation, error } = await supabase
        .from("student_invitations")
        .update({
          invitation_token: newToken,
          status: "pending",
          expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) {
        throw new SupabaseError(error.message, "INVITATION_UPDATE_ERROR");
      }

      return updatedInvitation;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to resend invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(
    teacherId: string,
    invitationId: string
  ): Promise<void> {
    try {
      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      // Verify ownership and delete
      const { error } = await supabase
        .from("student_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("teacher_id", teacherId);

      if (error) {
        throw new SupabaseError(error.message, "INVITATION_DELETE_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to cancel invitation",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get invitation statistics
   */
  static async getInvitationStats(teacherId: string): Promise<InvitationStats> {
    try {
      // Verify teacher permission
      await this.verifyTeacherPermission(teacherId);

      const { data: invitations, error } = await supabase
        .from("student_invitations")
        .select("status")
        .eq("teacher_id", teacherId);

      if (error) {
        throw new SupabaseError(error.message, "STATS_FETCH_ERROR");
      }

      const total = invitations?.length || 0;
      const pending =
        invitations?.filter((i) => i.status === "pending").length || 0;
      const accepted =
        invitations?.filter((i) => i.status === "accepted").length || 0;
      const expired =
        invitations?.filter((i) => i.status === "expired").length || 0;

      return { total, pending, accepted, expired };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch invitation statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Expire old invitations (cleanup job)
   */
  static async expireOldInvitations(): Promise<number> {
    try {
      const now = new Date().toISOString();

      const { data: expiredInvitations, error } = await supabase
        .from("student_invitations")
        .update({ status: "expired" })
        .eq("status", "pending")
        .lt("expires_at", now)
        .select("id");

      if (error) {
        throw new SupabaseError(error.message, "EXPIRE_INVITATIONS_ERROR");
      }

      return expiredInvitations?.length || 0;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to expire old invitations",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Parse CSV data for bulk invitations
   */
  static parseCsvEmails(csvData: string): string[] {
    try {
      const emails: string[] = [];
      const lines = csvData.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Handle CSV with headers or just email lists
        const parts = trimmedLine.split(",");
        for (const part of parts) {
          const email = part.trim().replace(/"/g, "");
          if (this.validateEmail(email)) {
            emails.push(email.toLowerCase());
          }
        }
      }

      // Remove duplicates
      return [...new Set(emails)];
    } catch (error) {
      throw new SupabaseError(
        "Failed to parse CSV data",
        "CSV_PARSE_ERROR",
        error
      );
    }
  }
}
