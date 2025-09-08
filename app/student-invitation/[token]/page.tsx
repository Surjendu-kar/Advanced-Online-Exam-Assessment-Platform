"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

interface InvitationData {
  id: string;
  student_email: string;
  exam_id: string | null;
  teacher_id: string;
  expires_at: string;
  created_at: string;
}

export default function StudentInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const validateInvitation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student-invitation/${token}`);
      const data = await response.json();

      // Check for redirect flag first (even if response is ok)
      if (data.redirectToStudent) {
        setShouldRedirect(true);
        router.push("/student");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Invalid invitation");
        return;
      }

      setInvitation(data.invitation);
    } catch (err) {
      setError("Failed to validate invitation");
      console.error("Validation error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token, validateInvitation]);

  const acceptInvitation = async () => {
    try {
      setAccepting(true);
      const response = await fetch(`/api/student-invitation/${token}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to accept invitation");
        return;
      }

      // If password is returned, auto-login the user
      if (data.password && data.studentEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.studentEmail,
          password: data.password,
        });

        if (signInError) {
          console.error("Error signing in:", signInError);
          toast.error(
            "Account created but failed to sign in. Please try logging in manually."
          );
          router.push("/login");
          return;
        }

        toast.success(
          "Welcome to the platform! Redirecting to your dashboard..."
        );

        // Wait for the session to be properly set, then redirect
        setTimeout(() => {
          // If exam_id exists, redirect to exam taking page
          if (data.examId) {
            router.push(`/student/exam/${data.examId}/take`);
          } else {
            router.push(data.redirectUrl || "/student");
          }
        }, 1500);
      } else {
        // Fallback to login page if no password data
        toast.success("Invitation accepted! Please log in to continue.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error("Accept invitation error:", err);
    } finally {
      setAccepting(false);
    }
  };

  if (loading || shouldRedirect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {shouldRedirect ? "Redirecting..." : "Validating invitation..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <Button onClick={() => router.push("/")} variant="outline">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Welcome to Online Exam Platform
          </h2>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Email:</strong> {invitation?.student_email}
            </p>
            {invitation?.exam_id ? (
              <p className="mt-1">
                <strong>Type:</strong> Exam Invitation
              </p>
            ) : (
              <p className="mt-1">
                <strong>Type:</strong> Platform Access
              </p>
            )}
            <p className="mt-1">
              <strong>Expires:</strong>{" "}
              {invitation &&
                new Date(invitation.expires_at).toLocaleDateString("en-GB")}
            </p>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {invitation?.exam_id
              ? "You've been invited to take an exam. Click below to access your account and start the exam."
              : "You've been invited to join the Online Exam Platform. Click below to access your account."}
          </p>

          <div className="mt-6">
            <Button
              onClick={acceptInvitation}
              className="w-full"
              loading={accepting}
              disabled={accepting}
            >
              {accepting
                ? "Accepting Invitation..."
                : invitation?.exam_id
                ? "Accept & Access Exam"
                : "Accept Invitation"}
            </Button>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500">
              By accepting this invitation, you agree to access the platform
              with your assigned student account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
