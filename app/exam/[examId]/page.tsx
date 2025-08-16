"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "../../../lib/components/AuthProvider";
import { Button } from "../../../components/ui/Button";

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const { examId } = params;
  
  const { user, loading } = useAuthContext();
  const [examSession, setExamSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Start exam session
  useEffect(() => {
    const startSession = async () => {
      if (!user || !examId) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch("/api/exam-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exam_id: examId,
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setExamSession(data.data);
        } else {
          setError(data.error || "Failed to start exam session");
        }
      } catch (err) {
        setError("Failed to start exam session");
        console.error("Start session error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && !loading && examId) {
      startSession();
    }
  }, [user, loading, examId]);
  
  if (loading || isLoading) {
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
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
              Error
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push("/student")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!examSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Starting Exam Session
          </h2>
          <p className="text-gray-600">
            Please wait while we prepare your exam...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {examSession.exam.title}
          </h1>
          <p className="mt-2 text-gray-600">
            Duration: {examSession.exam.duration} minutes
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Exam Instructions</h2>
              <p className="text-gray-600 mt-1">
                Please read the following instructions carefully before starting.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {examSession.exam.duration}:00
              </div>
              <div className="text-sm text-gray-500">Time Remaining</div>
            </div>
          </div>
          
          <div className="prose max-w-none mb-8">
            {examSession.exam.description ? (
              <p>{examSession.exam.description}</p>
            ) : (
              <p>No additional instructions provided.</p>
            )}
            
            <h3 className="text-lg font-medium mt-6 mb-3">Exam Rules</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>This exam contains multiple question types</li>
              <li>You have {examSession.exam.duration} minutes to complete the exam</li>
              <li>Make sure you have a stable internet connection</li>
              <li>Do not refresh or close the browser during the exam</li>
              {examSession.exam.require_webcam && (
                <li>Webcam monitoring is enabled for this exam</li>
              )}
              {examSession.exam.shuffle_questions && (
                <li>Questions are shuffled for each student</li>
              )}
            </ul>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={() => {
                // In a real implementation, this would start the actual exam
                alert("In a complete implementation, this would start the exam interface");
              }}
            >
              Start Exam
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}