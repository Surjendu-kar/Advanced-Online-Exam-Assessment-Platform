"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { TeacherInvitation } from "@/types/database";

interface StudentInvitation {
  id: string;
  student_email: string;
  first_name: string;
  last_name: string;
  status: string;
  exam_id?: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [institution, setInstitution] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Student invitation states
  const [studentEmail, setStudentEmail] = useState("");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentExpiryDate, setStudentExpiryDate] = useState("");
  const [studentSubmitting, setStudentSubmitting] = useState(false);

  // Data states
  const [studentInvitations, setStudentInvitations] = useState<
    StudentInvitation[]
  >([]);
  const [teacherInvitations, setTeacherInvitations] = useState<
    TeacherInvitation[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<"teachers" | "students">(
    "teachers"
  );

  useEffect(() => {
    if (!loading && (!user || user.profile?.role !== "admin")) {
      router.push("/login");
    } else if (user && user.profile?.role === "admin") {
      fetchData();
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      // Fetch teacher data
      const teacherRes = await fetch("/api/teachers", {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        setTeacherInvitations(teacherData.invitations || []);
      }

      // Fetch student data
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

  if (!user || user.profile?.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleTeacherInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Not authenticated");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          institution,
          expiresAt: expiryDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to invite teacher");
      } else {
        toast.success(
          `Teacher invited successfully! Invitation sent to ${email}`
        );
        setEmail("");
        setFirstName("");
        setLastName("");
        setInstitution("");
        setExpiryDate("");
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setStudentSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, usedAt?: string) => {
    // Handle legacy format where used_at determines status
    if (usedAt && !status) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
          Accepted
        </span>
      );
    }

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
      case "cancelled":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            Cancelled
          </span>
        );
      case "completed": // Legacy status used for backwards compatibility
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Accepted
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
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.profile?.first_name || "Admin"}
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Admin Panel
            </h2>
            <p className="text-gray-600">
              Manage users, invitations, and oversee the platform
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md mx-auto">
              <button
                onClick={() => setActiveTab("teachers")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "teachers"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Teachers
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "students"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Students
              </button>
            </div>
          </div>

          {/* Teacher Section */}
          {activeTab === "teachers" && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Invite a Teacher
                </h3>
                <form onSubmit={handleTeacherInvite} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="Teacher Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                    disabled={submitting}
                  />
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                    disabled={submitting}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                    disabled={submitting}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                    disabled={submitting}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      placeholder="Expiry Date (Optional)"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-transparent"
                      disabled={submitting}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-gray-500">
                      If not specified, invitation will expire in 7 days
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    loading={submitting}
                    disabled={submitting}
                  >
                    {submitting ? "Sending Invitation..." : "Invite Teacher"}
                  </Button>
                </form>
              </div>

              {/* Teacher Invitations List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Teacher Invitations
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  {loadingData ? (
                    <div className="p-6 text-center text-gray-500">
                      Loading invitations...
                    </div>
                  ) : teacherInvitations.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No teacher invitations yet
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Teacher Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Institution
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
                        {teacherInvitations.map((invitation) => (
                          <tr key={invitation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invitation.first_name} {invitation.last_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitation.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitation.institution || "Not specified"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(
                                invitation.status ||
                                  (invitation.used_at ? "accepted" : "pending")
                              )}
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

          {/* Student Section */}
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
                            Exam Status
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
                              {invitation.exam_id ? "Not Completed" : "No Exam"}
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
      </main>
    </div>
  );
}
