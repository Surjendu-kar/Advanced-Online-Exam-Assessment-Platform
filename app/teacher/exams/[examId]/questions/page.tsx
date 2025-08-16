"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "../../../../lib/components/AuthProvider";
import { Button } from "../../../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../../../components/ui/Card";

interface MCQQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

interface SAQQuestion {
  id: string;
  question_text: string;
  correct_answer?: string;
  marks: number;
}

interface CodingQuestion {
  id: string;
  question_text: string;
  language: string;
  marks: number;
}

export default function ExamQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const { examId } = params;
  
  const { user, loading } = useAuthContext();
  const [examTitle, setExamTitle] = useState("Exam Title");
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [saqQuestions, setSaqQuestions] = useState<SAQQuestion[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch exam questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user || !examId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch exam details
        const examResponse = await fetch(`/api/exams/${examId}`);
        const examData = await examResponse.json();
        
        if (examResponse.ok) {
          setExamTitle(examData.data.title);
        }
        
        // Fetch MCQ questions
        const mcqResponse = await fetch(`/api/mcq?exam_id=${examId}`);
        const mcqData = await mcqResponse.json();
        
        if (mcqResponse.ok) {
          setMcqQuestions(mcqData.data || []);
        }
        
        // Fetch SAQ questions
        const saqResponse = await fetch(`/api/saq?exam_id=${examId}`);
        const saqData = await saqResponse.json();
        
        if (saqResponse.ok) {
          setSaqQuestions(saqData.data || []);
        }
        
        // Fetch coding questions
        const codingResponse = await fetch(`/api/coding?exam_id=${examId}`);
        const codingData = await codingResponse.json();
        
        if (codingResponse.ok) {
          setCodingQuestions(codingData.data || []);
        }
      } catch (err) {
        setError("Failed to fetch questions");
        console.error("Fetch questions error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && !loading && examId) {
      fetchQuestions();
    }
  }, [user, loading, examId]);
  
  const handleAddMCQ = () => {
    router.push(`/teacher/exams/${examId}/questions/mcq/create`);
  };
  
  const handleAddSAQ = () => {
    router.push(`/teacher/exams/${examId}/questions/saq/create`);
  };
  
  const handleAddCoding = () => {
    router.push(`/teacher/exams/${examId}/questions/coding/create`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {examTitle}
          </h1>
          <p className="mt-2 text-gray-600">
            Manage exam questions
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MCQ Questions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Multiple Choice Questions</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {mcqQuestions.length}
                </span>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : mcqQuestions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No MCQ questions added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {mcqQuestions.map((question) => (
                    <Card key={question.id}>
                      <CardHeader>
                        <h3 className="text-md font-medium text-gray-900 line-clamp-2">
                          {question.question_text}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm">
                          <span>Marks: {question.marks}</span>
                          <span>{question.options.length} options</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <Button onClick={handleAddMCQ} className="w-full">
                Add MCQ Question
              </Button>
            </div>
          </div>
          
          {/* SAQ Questions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Short Answer Questions</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {saqQuestions.length}
                </span>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : saqQuestions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No SAQ questions added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {saqQuestions.map((question) => (
                    <Card key={question.id}>
                      <CardHeader>
                        <h3 className="text-md font-medium text-gray-900 line-clamp-2">
                          {question.question_text}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          Marks: {question.marks}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <Button onClick={handleAddSAQ} className="w-full">
                Add SAQ Question
              </Button>
            </div>
          </div>
          
          {/* Coding Questions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Coding Questions</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {codingQuestions.length}
                </span>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : codingQuestions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No coding questions added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {codingQuestions.map((question) => (
                    <Card key={question.id}>
                      <CardHeader>
                        <h3 className="text-md font-medium text-gray-900 line-clamp-2">
                          {question.question_text}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm">
                          <span>Marks: {question.marks}</span>
                          <span>{question.language}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <Button onClick={handleAddCoding} className="w-full">
                Add Coding Question
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            onClick={() => router.push(`/teacher/exams/${examId}/publish`)}
          >
            Publish Exam
          </Button>
        </div>
      </div>
    </div>
  );
}