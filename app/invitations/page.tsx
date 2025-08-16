"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../lib/hooks/useAuth";

interface Invitation {
  id: string;
  student_email: string;
  exam_id?: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}

export default function InvitationsPage() {
  const { user, loading } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [csvData, setCsvData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch invitations and stats
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invitationsRes, statsRes] = await Promise.all([
        fetch("/api/invitations"),
        fetch("/api/invitations/stats"),
      ]);

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.data || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      fetchData();
    }
  }, [user, loading]);

  // Create single invitation
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_email: newEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Invitation sent successfully!");
        setNewEmail("");
        fetchData(); // Refresh data
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch (err) {
      setError("Failed to send invitation");
      console.error("Create invitation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create bulk invitations
  const handleBulkInvitations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmails.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const emails = bulkEmails
        .split("\n")
        .map((email) => email.trim())
        .filter((email) => email);

      const response = await fetch("/api/invitations/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_emails: emails,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setBulkEmails("");
        fetchData(); // Refresh data
      } else {
        setError(data.error || "Failed to send bulk invitations");
      }
    } catch (err) {
      setError("Failed to send bulk invitations");
      console.error("Bulk invitations error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/invitations/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csv_data: csvData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setCsvData("");
        fetchData(); // Refresh data
      } else {
        setError(data.error || "Failed to process CSV");
      }
    } catch (err) {
      setError("Failed to process CSV");
      console.error("CSV upload error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend invitation
  const handleResend = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Invitation resent successfully!");
        fetchData(); // Refresh data
      } else {
        setError(data.error || "Failed to resend invitation");
      }
    } catch (err) {
      setError("Failed to resend invitation");
      console.error("Resend error:", err);
    }
  };

  // Cancel invitation
  const handleCancel = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Invitation cancelled successfully!");
        fetchData(); // Refresh data
      } else {
        setError(data.error || "Failed to cancel invitation");
      }
    } catch (err) {
      setError("Failed to cancel invitation");
      console.error("Cancel error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Please log in to access this page.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Student Invitations
          </h1>
          <p className="mt-2 text-gray-600">
            Manage student invitations for your exams
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Total</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Accepted</h3>
              <p className="text-3xl font-bold text-green-600">
                {stats.accepted}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Expired</h3>
              <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invitation Forms */}
          <div className="space-y-6">
            {/* Single Invitation */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Send Single Invitation
              </h2>
              <form onSubmit={handleCreateInvitation}>
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Student Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </button>
              </form>
            </div>

            {/* Bulk Invitations */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Send Bulk Invitations
              </h2>
              <form onSubmit={handleBulkInvitations}>
                <div className="mb-4">
                  <label
                    htmlFor="bulk-emails"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Student Emails (one per line)
                  </label>
                  <textarea
                    id="bulk-emails"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Bulk Invitations"}
                </button>
              </form>
            </div>

            {/* CSV Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Upload CSV</h2>
              <form onSubmit={handleCsvUpload}>
                <div className="mb-4">
                  <label
                    htmlFor="csv-data"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    CSV Data
                  </label>
                  <textarea
                    id="csv-data"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email1@example.com,email2@example.com&#10;or&#10;Email&#10;email1@example.com&#10;email2@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Process CSV"}
                </button>
              </form>
            </div>
          </div>

          {/* Invitations List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Recent Invitations</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">Loading invitations...</div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No invitations found. Send your first invitation!
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {invitation.student_email}
                          </p>
                          <p className="text-sm text-gray-500">
                            Status:
                            <span
                              className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                invitation.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : invitation.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {invitation.status}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires:{" "}
                            {new Date(
                              invitation.expires_at
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created:{" "}
                            {new Date(
                              invitation.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {invitation.status === "pending" && (
                            <button
                              onClick={() => handleResend(invitation.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Resend
                            </button>
                          )}
                          {invitation.status === "pending" && (
                            <button
                              onClick={() => handleCancel(invitation.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
