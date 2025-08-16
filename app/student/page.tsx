"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "../../lib/components/AuthProvider";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../components/ui/Card";

interface StudentExam {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: "upcoming" | "active" | "completed" | "expired";
  total_score?: number;
  max_score?: number;
}

export default function StudentDashboard() {
  const { user, loading } = useAuthContext();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is student
  useEffect(() => {
    if (!loading && user && user.profile?.role !== "student") {
      // Redirect non-student users
      window.location.href = "/";
    }
  }, [user, loading]);
  
  // Fetch student exams
  useEffect(() => {
    const fetchExams = async () => {
      if (!user || user.profile?.role !== "student") return;
      
      try {
        setIsLoading(true);
        const response = await fetch("/api/student/exams");
        const data = await response.json();
        
        if (response.ok) {
          setExams(data.data || []);
        } else {
          setError(data.error || "Failed to fetch exams");
        }
      } catch (err) {
        setError("Failed to fetch exams");
        console.error("Fetch exams error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && !loading) {
      fetchExams();
    }
  }, [user, loading]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please log in to access this page
          </p>
          <a
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  
  if (user.profile?.role !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Student Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            View and take your assigned exams
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Your Exams</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading exams...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-lg font-medium text-gray-900">No exams assigned</h3>
                <p className="mt-1 text-gray-500">
                  Your teacher will assign exams to you.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <Card key={exam.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {exam.title}
                          </h3>
                          {exam.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {exam.description}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Duration:</span>
                          <span className="text-sm font-medium">
                            {exam.duration} minutes
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Start Time:</span>
                          <span className="text-sm font-medium">
                            {new Date(exam.start_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">End Time:</span>
                          <span className="text-sm font-medium">
                            {new Date(exam.end_time).toLocaleDateString()}
                          </span>
                        </div>
                        {exam.status === "completed" && exam.total_score !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Score:</span>
                            <span className="text-sm font-medium">
                              {exam.total_score} / {exam.max_score}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      {exam.status === "active" ? (
                        <Button className="w-full">Start Exam</Button>
                      ) : exam.status === "upcoming" ? (
                        <Button variant="outline" className="w-full" disabled>
                          Starts Soon
                        </Button>
                      ) : exam.status === "completed" ? (
                        <Button variant="outline" className="w-full">
                          View Results
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          Exam Ended
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}