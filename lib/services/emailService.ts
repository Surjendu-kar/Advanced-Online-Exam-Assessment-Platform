import { SupabaseError } from "../supabaseClient";

export interface TeacherWelcomeEmailData {
  email: string;
  firstName: string;
  password: string;
}

export interface StudentInvitationEmailData {
  email: string;
  firstName?: string;
  examTitle: string;
  invitationLink: string;
  teacherName: string;
}

/**
 * Email service for sending notifications and invitations
 * Uses Supabase Edge Functions or external email service
 */
export class EmailService {
  /**
   * Send welcome email to newly created teacher account
   */
  static async sendTeacherWelcomeEmail(
    data: TeacherWelcomeEmailData
  ): Promise<void> {
    try {
      // In a real implementation, this would use an email service like:
      // - Supabase Edge Functions with Resend/SendGrid
      // - Direct integration with email providers
      // - SMTP service

      const emailTemplate = this.generateTeacherWelcomeTemplate(data);

      // For now, we'll log the email content
      // In production, replace this with actual email sending
      console.log("=== TEACHER WELCOME EMAIL ===");
      console.log(`To: ${data.email}`);
      console.log(`Subject: Welcome to Online Exam Platform`);
      console.log(emailTemplate);
      console.log("=============================");

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // TODO: Implement actual email sending
      // Example with fetch to Supabase Edge Function:
      /*
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.email,
          subject: 'Welcome to Online Exam Platform',
          html: emailTemplate,
          type: 'teacher_welcome'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      */
    } catch (error) {
      throw new SupabaseError(
        "Failed to send welcome email",
        "EMAIL_SEND_ERROR",
        error
      );
    }
  }

  /**
   * Send invitation email to student
   */
  static async sendStudentInvitationEmail(
    data: StudentInvitationEmailData
  ): Promise<void> {
    try {
      const emailTemplate = this.generateStudentInvitationTemplate(data);

      // For now, we'll log the email content
      console.log("=== STUDENT INVITATION EMAIL ===");
      console.log(`To: ${data.email}`);
      console.log(`Subject: Exam Invitation - ${data.examTitle}`);
      console.log(emailTemplate);
      console.log("================================");

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // TODO: Implement actual email sending (same as above)
    } catch (error) {
      throw new SupabaseError(
        "Failed to send invitation email",
        "EMAIL_SEND_ERROR",
        error
      );
    }
  }

  /**
   * Generate HTML template for teacher welcome email
   */
  private static generateTeacherWelcomeTemplate(
    data: TeacherWelcomeEmailData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Online Exam Platform</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .credentials { background: #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Online Exam Platform</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.firstName}!</h2>
            <p>Your teacher account has been successfully created. You can now start creating and managing exams for your students.</p>
            
            <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Password:</strong> ${data.password}</p>
                <p><em>Please change your password after your first login for security.</em></p>
            </div>

            <p>With your account, you can:</p>
            <ul>
                <li>Create and manage exams with multiple question types</li>
                <li>Invite students via email</li>
                <li>Monitor exams in real-time with proctoring features</li>
                <li>Grade submissions and publish results</li>
                <li>View detailed analytics and performance reports</li>
            </ul>

            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/login" class="button">
                Login to Your Account
            </a>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
            <p>© 2025 Online Exam Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML template for student invitation email
   */
  private static generateStudentInvitationTemplate(
    data: StudentInvitationEmailData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Invitation - ${data.examTitle}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f0fdf4; }
        .exam-info { background: #dcfce7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Exam Invitation</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.firstName || "Student"}!</h2>
            <p>You have been invited by <strong>${
              data.teacherName
            }</strong> to participate in an exam.</p>
            
            <div class="exam-info">
                <h3>Exam Details:</h3>
                <p><strong>Exam:</strong> ${data.examTitle}</p>
                <p><strong>Invited by:</strong> ${data.teacherName}</p>
            </div>

            <p>Click the button below to register and access your exam:</p>

            <a href="${data.invitationLink}" class="button">
                Join Exam
            </a>

            <p><strong>Important Notes:</strong></p>
            <ul>
                <li>This invitation link is unique to you and should not be shared</li>
                <li>Make sure you have a stable internet connection</li>
                <li>Ensure your webcam is working if required for proctoring</li>
                <li>Read all instructions carefully before starting</li>
            </ul>

            <p>If you have any questions about the exam, please contact your teacher directly.</p>
        </div>
        <div class="footer">
            <p>© 2025 Online Exam Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send exam results notification email
   */
  static async sendResultsNotificationEmail(
    email: string,
    examTitle: string,
    score: number,
    totalMarks: number
  ): Promise<void> {
    try {
      const percentage = Math.round((score / totalMarks) * 100);

      console.log("=== RESULTS NOTIFICATION EMAIL ===");
      console.log(`To: ${email}`);
      console.log(`Subject: Exam Results - ${examTitle}`);
      console.log(`Score: ${score}/${totalMarks} (${percentage}%)`);
      console.log("==================================");

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // TODO: Implement actual email sending
    } catch (error) {
      throw new SupabaseError(
        "Failed to send results notification",
        "EMAIL_SEND_ERROR",
        error
      );
    }
  }
}
