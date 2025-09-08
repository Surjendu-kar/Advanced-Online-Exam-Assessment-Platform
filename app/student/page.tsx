"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

interface StudentInvitation {
  id: string;
  student_email: string;
  first_name: string;
  last_name: string;
  status: string;
  exam_id?: string;
  expires_at: string;
  created_at: string;
  exam_title?: string;
}

export default function StudentPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.profile?.role !== "student")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.profile?.role !== "student") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const checkInvitations = async () => {
    if (!user) return;

    setLoadingInvitations(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Authentication required");
        return;
      }

      // Get student invitations
      const { data: invitationsData, error } = await supabase
        .from("student_invitations")
        .select(
          `
          *,
          exams:exam_id (
            title,
            unique_code
          )
        `
        )
        .or(`student_id.eq.${user.id},student_email.eq.${user.email}`);

      if (error) {
        console.error("Error fetching invitations:", error);
        toast.error("Failed to fetch invitations");
        return;
      }

      console.log("Debug - Student invitations:", invitationsData);
      setInvitations(invitationsData || []);

      if (invitationsData?.length === 0) {
        toast("No invitations found for your account", { icon: "ℹ️" });
      } else {
        toast.success(`Found ${invitationsData?.length} invitation(s)`);
      }
    } catch (error) {
      console.error("Error checking invitations:", error);
      toast.error("Failed to check invitations");
    } finally {
      setLoadingInvitations(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Student Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.profile?.first_name || "Student"}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Student Portal
              </h2>
              <p className="text-gray-600 mb-8">
                Take exams, view results, and track your progress
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Available Exams
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View and take available exams
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/student/exams")}
                  >
                    View Exams
                  </Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    My Results
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Check your exam results and scores
                  </p>
                  <Button className="w-full">View Results</Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Debug: Check Invitations
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Check your invitation status for debugging
                  </p>
                  <Button
                    className="w-full"
                    onClick={checkInvitations}
                    loading={loadingInvitations}
                    disabled={loadingInvitations}
                  >
                    Check Invitations
                  </Button>
                </div>
              </div>

              {/* Debug Information */}
              {invitations.length > 0 && (
                <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Your Invitations (Debug)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Exam
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invitations.map((invitation) => (
                          <tr key={invitation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invitation.student_email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitation.exam_id ? (
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {(invitation as any).exams?.title || "Exam"}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Code:{" "}
                                    {(invitation as any).exams?.unique_code}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  General Access
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  invitation.status === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : invitation.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {invitation.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitation.exam_id &&
                                invitation.status === "accepted" && (
                                  <Button
                                    className="text-xs px-2 py-1"
                                    onClick={() =>
                                      router.push(
                                        `/student/exam/${invitation.exam_id}/take`
                                      )
                                    }
                                  >
                                    Take Exam
                                  </Button>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
