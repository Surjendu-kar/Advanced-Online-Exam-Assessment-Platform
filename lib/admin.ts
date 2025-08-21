import type { SupabaseClient } from "@supabase/supabase-js";
import { TeacherInvitation } from "@/types/database";
import nodemailer from "nodemailer";

export interface CreateTeacherInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  institution?: string;
  createdBy: string;
}

export interface CreateTeacherInvitationResult {
  success: boolean;
  invitation?: TeacherInvitation;
  error?: string;
}

// Generate a secure token for teacher invitations
function generateInvitationToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create teacher invitation (new approach)
export async function createTeacherInvitation(
  supabase: SupabaseClient,
  {
    email,
    firstName,
    lastName,
    institution,
    createdBy,
  }: CreateTeacherInvitationData
): Promise<CreateTeacherInvitationResult> {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users?.some(
      (user) => user.email === email
    );

    if (userExists) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    // Check if invitation already exists and is not used
    const { data: existingInvitation } = await supabase
      .from("teacher_invitations")
      .select("*")
      .eq("email", email)
      .is("used_at", null)
      .single();

    if (existingInvitation) {
      return {
        success: false,
        error: "An invitation for this email is already pending",
      };
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from("teacher_invitations")
      .insert({
        email,
        token,
        admin_id: createdBy,
        first_name: firstName,
        last_name: lastName,
        institution,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      return {
        success: false,
        error: invitationError?.message || "Failed to create invitation",
      };
    }

    // Send invitation email
    await sendTeacherInvitationEmail(email, firstName, token);

    return {
      success: true,
      invitation: invitation as TeacherInvitation,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Complete teacher registration (called from signup page)
export async function completeTeacherRegistration(
  supabase: SupabaseClient,
  token: string,
  password: string
): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from("teacher_invitations")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (invitationError || !invitation) {
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

    // Create the auth user
    const { data: newUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.first_name,
          last_name: invitation.last_name,
        },
      });

    if (authError || !newUser.user) {
      return {
        success: false,
        error: authError?.message || "Failed to create user account",
      };
    }

    // Create the user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: newUser.user.id,
        role: "teacher",
        created_by: invitation.admin_id,
        institution: invitation.institution,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        verified: true,
      });

    if (profileError) {
      // Cleanup: Delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return {
        success: false,
        error: profileError.message || "Failed to create user profile",
      };
    }

    // Mark invitation as used
    await supabase
      .from("teacher_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    return {
      success: true,
      user: newUser.user,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Validate invitation token (for signup page)
export async function validateInvitationToken(
  supabase: SupabaseClient,
  token: string
): Promise<{
  valid: boolean;
  invitation?: TeacherInvitation;
  error?: string;
}> {
  try {
    const { data: invitation, error } = await supabase
      .from("teacher_invitations")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (error || !invitation) {
      return {
        valid: false,
        error: "Invalid invitation token",
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
      invitation: invitation as TeacherInvitation,
    };
  } catch (err) {
    return {
      valid: false,
      error: (err as Error).message || String(err),
    };
  }
}

// Get all teacher invitations for an admin
export async function getTeacherInvitations(
  supabase: SupabaseClient,
  adminId: string
): Promise<TeacherInvitation[]> {
  const { data, error } = await supabase
    .from("teacher_invitations")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching teacher invitations:", error);
    return [];
  }

  return data as TeacherInvitation[];
}

// Send invitation email (placeholder - implement with your email service)
async function sendTeacherInvitationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-signup/${token}`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Complete Your Teacher Account Setup",
    text: `Hi ${firstName},

You've been invited to join our Online Exam Platform as a teacher.

Click here to complete your registration:
${signupUrl}

This invitation expires in 7 days.

Best regards,
The Exam Platform Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send invitation email:", error);
  }
}

// Legacy function for backward compatibility (you can remove this later)
export async function createTeacherAccount(
  supabase: SupabaseClient,
  data: any
) {
  console.warn(
    "createTeacherAccount is deprecated. Use createTeacherInvitation instead."
  );
  return createTeacherInvitation(supabase, data);
}
