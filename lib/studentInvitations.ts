// lib/studentInvitations.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { StudentInvitation } from "@/types/database";
import nodemailer from "nodemailer";

export interface CreateStudentInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  examId?: string;
  createdBy: string; // teacher_id
  expiresAt?: Date; // optional expiry date
}

export interface CreateStudentInvitationResult {
  success: boolean;
  invitation?: StudentInvitation;
  error?: string;
}

// Generate a secure token for student invitations
function generateInvitationToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create student invitation using Supabase auth invite
export async function createStudentInvitation(
  supabase: SupabaseClient,
  {
    email,
    firstName,
    lastName,
    examId,
    createdBy,
    expiresAt,
  }: CreateStudentInvitationData
): Promise<CreateStudentInvitationResult> {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users?.find(
      (user) => user.email === email
    );

    let studentUserId: string;
    let invitationToken: string | null = null;

    // Generate token if this is for an exam
    if (examId) {
      invitationToken = generateInvitationToken();
    }

    if (existingUser) {
      // Check if existing user is already a student
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", existingUser.id)
        .single();

      if (existingProfile?.role !== "student") {
        return {
          success: false,
          error: "A user with this email exists but is not a student",
        };
      }

      studentUserId = existingUser.id;

      // For existing users, just create invitation record
      const invitationExpiresAt =
        expiresAt || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const { data: invitation, error: invitationError } = await supabase
        .from("student_invitations")
        .insert({
          teacher_id: createdBy,
          student_email: email,
          first_name: firstName,
          last_name: lastName,
          invitation_token: invitationToken || generateInvitationToken(),
          exam_id: examId || null,
          student_id: studentUserId,
          status: "pending",
          expires_at: invitationExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (invitationError) {
        return {
          success: false,
          error: "Failed to create invitation",
        };
      }

      return {
        success: true,
        invitation: invitation as StudentInvitation,
      };
    } else {
      // Create invitation record first, then send custom email (like teacher flow)
      const invitationToken = generateInvitationToken();
      const invitationExpiresAt =
        expiresAt || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const { data: invitation, error: invitationError } = await supabase
        .from("student_invitations")
        .insert({
          teacher_id: createdBy,
          student_email: email,
          first_name: firstName,
          last_name: lastName,
          invitation_token: invitationToken,
          exam_id: examId || null,
          status: "pending",
          expires_at: invitationExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (invitationError) {
        return {
          success: false,
          error: "Failed to create invitation",
        };
      }

      // Send custom invitation email
      await sendStudentInvitationEmail(
        email,
        firstName,
        invitationToken,
        examId
      );

      return {
        success: true,
        invitation: invitation as StudentInvitation,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Accept student invitation (for exam access tracking)
export async function acceptStudentInvitation(
  supabase: SupabaseClient,
  token: string
): Promise<{
  success: boolean;
  examId?: string;
  studentEmail?: string;
  password?: string;
  error?: string;
}> {
  try {
    // Get invitation by token (only for exam tracking)
    const { data: invitation, error: invitationError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitation) {
      // If no token-based invitation found, this might be a direct Supabase auth invite
      // Allow access for authenticated users
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return {
          success: true,
          studentEmail: user.email,
        };
      }
      return {
        success: false,
        error: "Invalid or expired invitation token",
      };
    }

    // Check if invitation is expired
    if (new Date() > new Date(invitation.expires_at)) {
      return {
        success: false,
        error: "Invitation has expired",
      };
    }

    // Create user account if not exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users?.find(
      (user) => user.email === invitation.student_email
    );

    if (!existingUser) {
      // Create user account automatically
      const tempPassword = generateInvitationToken().substring(0, 12) + "A1!";

      const { data: newUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: invitation.student_email,
          password: tempPassword,
          email_confirm: true,
        });

      if (authError || !newUser.user) {
        return {
          success: false,
          error: "Failed to create student account",
        };
      }

      // Create student profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: newUser.user.id,
          role: "student",
          created_by: invitation.teacher_id,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          verified: true,
        });

      if (profileError) {
        await supabase.auth.admin.deleteUser(newUser.user.id);
        return {
          success: false,
          error: "Failed to create student profile",
        };
      }

      // Update invitation with student_id
      await supabase
        .from("student_invitations")
        .update({ student_id: newUser.user.id })
        .eq("invitation_token", token);

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("student_invitations")
        .update({ status: "accepted" })
        .eq("invitation_token", token);

      if (updateError) {
        console.error("Failed to update invitation status:", updateError);
      }

      return {
        success: true,
        examId: invitation.exam_id,
        studentEmail: invitation.student_email,
        password: tempPassword,
      };
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("student_invitations")
      .update({ status: "accepted" })
      .eq("invitation_token", token);

    if (updateError) {
      console.error("Failed to update invitation status:", updateError);
    }

    return {
      success: true,
      examId: invitation.exam_id,
      studentEmail: invitation.student_email,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Validate invitation token (for student access)
export async function validateStudentInvitationToken(
  supabase: SupabaseClient,
  token: string
): Promise<{
  valid: boolean;
  invitation?: StudentInvitation;
  redirectToStudent?: boolean;
  error?: string;
}> {
  try {
    const { data: invitation, error } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("invitation_token", token)
      .single();

    if (error || !invitation) {
      return {
        valid: false,
        error: "Invalid invitation token",
      };
    }

    // Check if already accepted - redirect to student page
    if (invitation.status === "accepted") {
      return {
        valid: false,
        redirectToStudent: true,
        error: "Invitation already accepted",
      };
    }

    // Check if expired
    if (new Date() > new Date(invitation.expires_at)) {
      return {
        valid: false,
        error: "Invitation has expired",
      };
    }

    return {
      valid: true,
      invitation: invitation as StudentInvitation,
    };
  } catch (err) {
    return {
      valid: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Get all student invitations for a teacher
export async function getStudentInvitations(
  supabase: SupabaseClient,
  teacherId: string,
  examId?: string
): Promise<StudentInvitation[]> {
  let query = supabase
    .from("student_invitations")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (examId) {
    query = query.eq("exam_id", examId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching student invitations:", error);
    return [];
  }

  return data as StudentInvitation[];
}

// Get students for a teacher (from user_profiles)
export async function getTeacherStudents(
  supabase: SupabaseClient,
  teacherId: string
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("role", "student")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching teacher students:", error);
    return [];
  }

  return data || [];
}

// Send invitation email (placeholder - implement with your email service)
async function sendStudentInvitationEmail(
  email: string,
  firstName: string,
  token: string,
  examId?: string
): Promise<void> {
  const invitationUrl = examId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/student-invitation/${token}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/student-invitation/${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const examText = examId ? "for an upcoming exam" : "to the platform";

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "You're Invited to Online Exam Platform",
    text: `Hi ${firstName},

You've been invited to join our Online Exam Platform ${examText}.

Click here to access your account:
${invitationUrl}

Your account has been created automatically. You can log in directly using this link.

Best regards,
The Exam Platform Team`,
    html: `
      <h2>Welcome to Online Exam Platform</h2>
      <p>Hi ${firstName},</p>
      
      <p>You've been invited to join our Online Exam Platform ${examText}.</p>
      
      <p><a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Account</a></p>
      
      <p>Your account has been created automatically. You can log in directly using this link.</p>
      
      <p>Best regards,<br>The Exam Platform Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send student invitation email:", error);
  }
}

// Resend invitation
export async function resendStudentInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("teacher_id", teacherId)
      .single();

    if (fetchError || !invitation) {
      return {
        success: false,
        error: "Invitation not found",
      };
    }

    // Generate new token and extend expiry
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    // Update invitation
    const { error: updateError } = await supabase
      .from("student_invitations")
      .update({
        invitation_token: newToken,
        expires_at: newExpiresAt.toISOString(),
        status: "pending",
      })
      .eq("id", invitationId);

    if (updateError) {
      return {
        success: false,
        error: "Failed to update invitation",
      };
    }

    // Resend email
    const firstName =
      invitation.first_name || invitation.student_email.split("@")[0];
    await sendStudentInvitationEmail(
      invitation.student_email,
      firstName,
      newToken,
      invitation.exam_id
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}
