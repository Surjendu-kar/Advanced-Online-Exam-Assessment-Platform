"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [institution, setInstitution] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.profile?.role !== "admin")) {
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

  if (!user || user.profile?.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          institution,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to invite teacher");
      } else {
        setMessage(`Teacher invited successfully: ${email}`);
        setEmail("");
        setFirstName("");
        setLastName("");
        setInstitution("");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
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
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Admin Panel
              </h2>
              <p className="text-gray-600 mb-8">
                Manage teachers, monitor exams, and oversee the platform
              </p>

              {/* Invite Teacher Form */}
              <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Invite a Teacher
                </h3>
                <form onSubmit={handleInvite} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="Teacher Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-black p-2 rounded placeholder-gray-400 text-black"
                  />
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-black p-2 rounded placeholder-gray-400 text-black"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-black p-2 rounded placeholder-gray-400 text-black"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full border border-black p-2 rounded placeholder-gray-400 text-black"
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Inviting..." : "Invite Teacher"}
                  </Button>
                </form>

                {message && (
                  <p className="mt-4 text-green-600 font-medium">{message}</p>
                )}
                {error && (
                  <p className="mt-4 text-red-600 font-medium">{error}</p>
                )}
              </div>

              {/* Other Admin Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Teacher Management
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add, edit, and manage teacher accounts
                  </p>
                  <Button className="w-full">Manage Teachers</Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    System Analytics
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View platform usage and performance metrics
                  </p>
                  <Button className="w-full">View Analytics</Button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Platform Settings
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Configure system settings and preferences
                  </p>
                  <Button className="w-full">Settings</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
