"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface InvitationData {
  id: string;
  teacher_id: string;
  student_email: string;
  exam_id?: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/invitations/token/${token}`);
        const data = await response.json();

        if (response.ok) {
          setInvitation(data.data);
        } else {
          setError(data.error || "Invalid invitation");
        }
      } catch (err) {
        setError("Failed to load invitation");
        console.error("Fetch invitation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Accept invitation
  const handleAcceptInvitation = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to registration or login page after a delay
        setTimeout(() => {
          router.push("/auth/register?invitation=accepted");
        }, 3000);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError("Failed to accept invitation");
      console.error("Accept invitation error:", err);
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation Accepted!
          </h1>
          <p className="text-gray-600 mb-6">
            Your invitation has been accepted successfully. You will be
            redirected to complete your registration.
          </p>
          <div className="text-sm text-gray-500">
            Redirecting in 3 seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <svg
            className="mx-auto h-12 w-12 text-blue-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            You have been invited to join the exam platform as a student.
          </p>
        </div>

        {invitation && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">
              Invitation Details
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-600">
                  {invitation.student_email}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 text-gray-600 capitalize">
                  {invitation.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Expires:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </span>
              </div>
              {invitation.exam_id && (
                <div>
                  <span className="font-medium text-gray-700">Exam ID:</span>
                  <span className="ml-2 text-gray-600">
                    {invitation.exam_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Accepting...
              </div>
            ) : (
              "Accept Invitation"
            )}
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          By accepting this invitation, you agree to create a student account on
          this platform.
        </div>
      </div>
    </div>
  );
}
