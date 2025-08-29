"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import ExamCreateModal from "@/components/exam/create-exam/ExamCreateModal";

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

interface Exam {
  id: string;
  title: string;
  description?: string;
  unique_code: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  access_type: string;
  max_attempts: number;
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

  // Exam creation states
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data states
  const [studentInvitations, setStudentInvitations] = useState<
    StudentInvitation[]
  >([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<"exams" | "students">("exams");

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

      // Fetch exams
      const examRes = await fetch("/api/exams", {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      if (examRes.ok) {
        const examData = await examRes.json();
        setExams(examData.exams || []);
      }

      // Fetch student invitations
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
    // ... existing code ...
  };

  const handleExamCreationSuccess = () => {
    fetchData(); // Refresh the exams list
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

              {/* Tabs */}
              <div className="mb-8">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md mx-auto">
                  <button
                    onClick={() => setActiveTab("exams")}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "exams"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Exams ({exams.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("students")}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "students"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Students ({studentInvitations.length})
                  </button>
                </div>
              </div>

              {/* Exams Tab */}
              {activeTab === "exams" && (
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Create New Exam
                      </Button>
                      <Button variant="outline" className="w-full">
                        Import Questions
                      </Button>
                    </div>
                  </div>

                  {/* Exams List */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        My Exams
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      {loadingData ? (
                        <div className="p-6 text-center text-gray-500">
                          Loading exams...
                        </div>
                      ) : exams.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          No exams created yet. Create your first exam to get
                          started.
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Exam Title
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Code
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Schedule
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Questions
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {exams.map((exam) => (
                              <tr key={exam.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {exam.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <code className="bg-gray-100 px-2 py-1 rounded">
                                    {exam.unique_code}
                                  </code>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {exam.start_time ? (
                                    <div>
                                      <div>
                                        {new Date(
                                          exam.start_time
                                        ).toLocaleDateString("en-GB")}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(
                                          exam.start_time
                                        ).toLocaleTimeString("en-GB", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">
                                      Not scheduled
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="text-gray-400">-</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(exam.created_at).toLocaleDateString(
                                    "en-GB"
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      className="text-xs px-2 py-1"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="text-xs px-2 py-1"
                                      onClick={() =>
                                        router.push(
                                          `/exam-questions/${exam.id}`
                                        )
                                      }
                                    >
                                      Questions
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Students Tab */}
              {activeTab === "students" && (
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
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
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                        disabled={studentSubmitting}
                      />
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={studentFirstName}
                        onChange={(e) => setStudentFirstName(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                        disabled={studentSubmitting}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Last Name"
                        value={studentLastName}
                        onChange={(e) => setStudentLastName(e.target.value)}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
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
                          className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
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

                  {/* Student Invitations List */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {invitation.first_name} {invitation.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {invitation.student_email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {getStatusBadge(invitation.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    invitation.created_at
                                  ).toLocaleDateString("en-GB")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Exam Creation Modal */}
      <ExamCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleExamCreationSuccess}
      />
    </div>
  );
}
