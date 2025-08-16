"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "../../../../../lib/components/AuthProvider";
import { Input } from "../../../../../components/ui/Input";
import { Button } from "../../../../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../../../../components/ui/Card";

export default function CreateCodingPage() {
  const router = useRouter();
  const params = useParams();
  const { examId } = params;
  
  const { user, loading } = useAuthContext();
  
  const [questionText, setQuestionText] = useState("");
  const [marks, setMarks] = useState(10);
  const [language, setLanguage] = useState("python");
  const [starterCode, setStarterCode] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/coding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: examId,
          question_text: questionText.trim(),
          marks: parseInt(marks.toString()),
          language,
          starter_code: starterCode.trim() || undefined,
          expected_output: expectedOutput.trim() || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect back to questions page
        router.push(`/teacher/exams/${examId}/questions`);
      } else {
        setError(data.error || "Failed to create coding question");
      }
    } catch (err) {
      setError("Failed to create coding question");
      console.error("Create coding error:", err);
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Coding Question
          </h1>
          <p className="mt-2 text-gray-600">
            Add a coding challenge to your exam
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Question Details</h2>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Marks"
                    type="number"
                    min="1"
                    value={marks}
                    onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starter Code (Optional)
                </label>
                <textarea
                  rows={5}
                  className="font-mono text-sm block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder="Enter starter code for the student"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Output (Optional)
                </label>
                <textarea
                  rows={3}
                  className="font-mono text-sm block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Enter the expected output for auto-grading"
                />
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Coding Question"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}