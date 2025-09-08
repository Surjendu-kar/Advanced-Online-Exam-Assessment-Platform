"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

interface GradingDashboardProps {
  examId: string;
  onClose: () => void;
}

interface GradingStats {
  total_responses: number;
  pending_grading: number;
  partial_grading: number;
  completed_grading: number;
  average_score: number;
  total_questions: number;
  highest_score: number;
  lowest_score: number;
}

interface StudentResponse {
  id: string;
  student_first_name: string;
  student_last_name: string;
  student_email: string;
  total_score: number;
  grading_status: string;
  submitted_at: string;
  answers: any;
}

export default function GradingDashboard({
  examId,
  onClose,
}: GradingDashboardProps) {
  const [stats, setStats] = useState<GradingStats | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "partial" | "completed"
  >("all");

  useEffect(() => {
    fetchGradingData();
  }, [examId]);

  const fetchGradingData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      // Fetch grading statistics
      const statsRes = await fetch(`/api/exams/${examId}/grading/stats`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch all responses
      const responsesRes = await fetch(`/api/exams/${examId}/responses`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        setResponses(responsesData.responses || []);
      }
    } catch (error) {
      console.error("Error fetching grading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = responses.filter((response) => {
    if (filter === "all") return true;
    return response.grading_status === filter;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-blue-100 text-blue-800",
      partial: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status === "partial"
          ? "Needs Grading"
          : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading grading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Grading Dashboard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close grading dashboard"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {stats && (
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">
                  Total Submissions
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.total_responses}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Grading
                </h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.pending_grading + stats.partial_grading}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">
                  Completed
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {stats.completed_grading}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">
                  Average Score
                </h3>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.average_score.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Filter by status:
              </span>
              {["all", "pending", "partial", "completed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    filter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[50vh] p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResponses.map((response) => (
                  <tr key={response.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {response.student_first_name} {response.student_last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {response.student_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        {response.total_score} marks
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(response.grading_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.submitted_at).toLocaleDateString(
                        "en-GB"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button
                        variant="outline"
                        className="text-xs px-2 py-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => {
                          // This would open the grading modal for this specific response
                          // Implementation depends on parent component structure
                        }}
                      >
                        {response.grading_status === "completed"
                          ? "View"
                          : "Grade"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
