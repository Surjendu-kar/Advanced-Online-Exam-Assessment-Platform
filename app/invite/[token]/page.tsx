"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";

interface InvitationPageProps {
  params: {
    token: string;
  };
}

interface InvitationResult {
  user: any;
  exam?: any;
  redirectTo: string;
}

export default function InvitationPage({ params }: InvitationPageProps) {
  const { token } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processInvitation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call invitation processing API
        const response = await fetch(`/api/student/invitation?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to process invitation");
        }

        const result: InvitationResult = data.data;
        setSuccess(true);

        // If user is already logged in and it's the same user, redirect immediately
        if (user && user.id === result.user.id) {
          setTimeout(() => {
            router.push(result.redirectTo);
          }, 2000);
          return;
        }

        // If different user or no user, show success message and redirect to login
        setTimeout(() => {
          const redirectUrl = encodeURIComponent(result.redirectTo);
          router.push(
            `/login?redirect=${redirectUrl}&message=invitation-processed`
          );
        }, 3000);
      } catch (err) {
        console.error("Invitation processing error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process invitation"
        );
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      processInvitation();
    }
  }, [token, router, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Invitation
            </h2>
            <p className="text-gray-600">
              Please wait while we set up your account...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Error
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Processed Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your student account has been set up. You will be redirected to
              login shortly.
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              Redirecting...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
