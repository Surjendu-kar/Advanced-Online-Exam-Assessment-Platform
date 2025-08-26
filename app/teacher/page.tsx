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
}

export default function TeacherPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Student invitation states
  const [studentEmail, setStudentEmail] = useState("");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentExpiryDate, setStudentExpiryDate] = useState("");
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Data states
  const [studentInvitations, setStudentInvitations] = useState<
    StudentInvitation[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.profile?.role !== "teacher")) {
      router.push("/login");
    } else if (user && user.profile?.role === "teacher") {
      fetchData();
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const studentRes = await fetch("/api/students", {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        setStudentInvitations(studentData.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

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

  if (!user || user.profile?.role !== "teacher") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleStudentInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Not authenticated");
        setStudentSubmitting(false);
        return;
      }

      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          email: studentEmail,
          firstName: studentFirstName,
          lastName: studentLastName,
          expiresAt: studentExpiryDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to invite student");
      } else {
        toast.success(
          `Student invited successfully! Invitation sent to ${studentEmail}`
        );
        setStudentEmail("");
        setStudentFirstName("");
        setStudentLastName("");
        setStudentExpiryDate("");
        setShowInviteForm(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setStudentSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "accepted":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Accepted
          </span>
        );
      case "expired":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Teacher Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.profile?.first_name || "Teacher"}
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
                Teacher Panel
              </h2>
              <p className="text-gray-600 mb-8">
                Create exams, invite students, and manage assessments
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Create Exam
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create new exams with questions
                  </p>
                  <Button className="w-full">New Exam</Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    My Exams
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View and manage your exams
                  </p>
                  <Button className="w-full">View Exams</Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Invite Students
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Send exam invitations to students
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                  >
                    {showInviteForm ? "Cancel" : "Invite Students"}
                  </Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Results & Grading
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Review and grade exam results
                  </p>
                  <Button className="w-full">View Results</Button>
                </div>
              </div>

              {/* Student Invitation Form */}
              {showInviteForm && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Invite a Student
                  </h3>
                  <form onSubmit={handleStudentInvite} className="space-y-4">
                    <input
                      type="email"
                      required
                      placeholder="Student Email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={studentSubmitting}
                    />
                    <input
                      type="text"
                      required
                      placeholder="First Name"
                      value={studentFirstName}
                      onChange={(e) => setStudentFirstName(e.target.value)}
                      className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={studentSubmitting}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Last Name"
                      value={studentLastName}
                      onChange={(e) => setStudentLastName(e.target.value)}
                      className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={studentSubmitting}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        placeholder="Expiry Date (Optional)"
                        value={studentExpiryDate}
                        onChange={(e) => setStudentExpiryDate(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={studentSubmitting}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-gray-500">
                        If not specified, invitation will expire in 2 days
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      loading={studentSubmitting}
                      disabled={studentSubmitting}
                    >
                      {studentSubmitting
                        ? "Sending Invitation..."
                        : "Invite Student"}
                    </Button>
                  </form>
                </div>
              )}

              {/* Student Invitations List */}
              <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 ">
                    Student Invitations
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  {loadingData ? (
                    <div className="p-6 text-center text-gray-500">
                      Loading invitations...
                    </div>
                  ) : studentInvitations.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No student invitations yet
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invited
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expires
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentInvitations.map((invitation) => (
                          <tr key={invitation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-left   font-medium text-gray-900">
                              {invitation.first_name} {invitation.last_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-left  text-gray-500">
                              {invitation.student_email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-left ">
                              {getStatusBadge(invitation.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-left  text-gray-500">
                              {new Date(
                                invitation.created_at
                              ).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-left  text-gray-500">
                              {new Date(
                                invitation.expires_at
                              ).toLocaleDateString("en-GB")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
