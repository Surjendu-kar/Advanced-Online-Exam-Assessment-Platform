"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "../../lib/components/AuthProvider";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../components/ui/Card";
import Link from "next/link";

interface Exam {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  is_published: boolean;
  total_marks: number;
  duration: number;
}

export default function TeacherDashboard() {
  const { user, loading } = useAuthContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is teacher
  useEffect(() => {
    if (!loading && user && !["teacher", "admin"].includes(user.profile?.role || "")) {
      // Redirect non-teacher users
      window.location.href = "/";
    }
  }, [user, loading]);
  
  // Fetch exams
  useEffect(() => {
    const fetchExams = async () => {
      if (!user || !["teacher", "admin"].includes(user.profile?.role || "")) return;
      
      try {
        setIsLoading(true);
        const response = await fetch("/api/exams");
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
  
  if (!["teacher", "admin"].includes(user.profile?.role || "")) {
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Create and manage your exams
            </p>
          </div>
          <Link href="/teacher/exams/create">
            <Button>Create New Exam</Button>
          </Link>
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
                <h3 className="mt-2 text-lg font-medium text-gray-900">No exams</h3>
                <p className="mt-1 text-gray-500">
                  Get started by creating a new exam.
                </p>
                <div className="mt-6">
                  <Link href="/teacher/exams/create">
                    <Button>Create New Exam</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <Card key={exam.id}>
                    <CardHeader>
                      <h3 className="text-lg font-medium text-gray-900">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {exam.description}
                        </p>
                      )}
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
                          <span className="text-sm text-gray-500">Total Marks:</span>
                          <span className="text-sm font-medium">
                            {exam.total_marks}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`text-sm font-medium ${
                            exam.is_published 
                              ? "text-green-600" 
                              : "text-yellow-600"
                          }`}>
                            {exam.is_published ? "Published" : "Draft"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Link href={`/teacher/exams/${exam.id}/edit`}>
                        <Button variant="outline">Edit</Button>
                      </Link>
                      <Link href={`/teacher/exams/${exam.id}/questions`}>
                        <Button>Questions</Button>
                      </Link>
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