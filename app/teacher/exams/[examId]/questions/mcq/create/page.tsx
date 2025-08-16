"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "../../../../../lib/components/AuthProvider";
import { Input } from "../../../../../components/ui/Input";
import { Button } from "../../../../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../../../../components/ui/Card";

export default function CreateMCQPage() {
  const router = useRouter();
  const params = useParams();
  const { examId } = params;
  
  const { user, loading } = useAuthContext();
  
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [marks, setMarks] = useState(1);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addOption = () => {
    setOptions([...options, ""]);
  };
  
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    
    // Adjust correct option if needed
    if (correctOption >= index && correctOption > 0) {
      setCorrectOption(correctOption - 1);
    }
  };
  
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // Validate options
    const nonEmptyOptions = options.filter(option => option.trim() !== "");
    if (nonEmptyOptions.length < 2) {
      setError("At least 2 options are required");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/mcq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: examId,
          question_text: questionText.trim(),
          options: options.map(option => option.trim()),
          correct_option: correctOption,
          marks: parseInt(marks.toString()),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect back to questions page
        router.push(`/teacher/exams/${examId}/questions`);
      } else {
        setError(data.error || "Failed to create MCQ question");
      }
    } catch (err) {
      setError("Failed to create MCQ question");
      console.error("Create MCQ error:", err);
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
            Create MCQ Question
          </h1>
          <p className="mt-2 text-gray-600">
            Add a multiple choice question to your exam
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marks
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={marks}
                  onChange={(e) => setMarks(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Options
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    Add Option
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex items-center h-5 mt-1">
                        <input
                          type="radio"
                          name="correctOption"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          checked={correctOption === index}
                          onChange={() => setCorrectOption(index)}
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <input
                          type="text"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          required
                        />
                      </div>
                      {options.length > 2 && (
                        <div className="ml-2">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900"
                            onClick={() => removeOption(index)}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
              {isSubmitting ? "Creating..." : "Create MCQ"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}