"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

interface Question {
  id: string;
  type: "mcq" | "saq" | "coding";
  question_text: string;
  marks: number;
  data: any;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  unique_code: string;
  created_by: string;
  duration?: number; // Duration in minutes
}

interface ExamSession {
  id: string;
  exam_id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  status: "not_started" | "in_progress" | "completed" | "terminated";
  total_score: number;
  violations_count: number;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && examStarted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Auto-submit when time is up
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, examStarted]);

  // Load exam and questions
  const loadExamData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user) {
        toast.error("Please log in to take the exam");
        router.push("/login");
        return;
      }

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Authentication required");
        router.push("/login");
        return;
      }

      // Fetch exam details
      const examResponse = await fetch(`/api/exams/${examId}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      console.log(`Debug - Exam fetch response for ${examId}:`, {
        status: examResponse.status,
        ok: examResponse.ok,
      });

      if (!examResponse.ok) {
        const errorData = await examResponse.json();
        console.error(`Debug - Exam fetch error:`, errorData);
        toast.error(errorData.error || "Failed to load exam");
        router.push("/student");
        return;
      }

      const examData = await examResponse.json();
      console.log("Debug - Exam data:", examData);
      setExam(examData.exam);

      // Fetch questions
      const questionsResponse = await fetch(`/api/exams/${examId}/questions`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      console.log("Debug - Questions fetch response:", {
        status: questionsResponse.status,
        ok: questionsResponse.ok,
      });

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json();
        console.error("Debug - Questions fetch error:", errorData);
        toast.error("Failed to load exam questions");
        router.push("/student");
        return;
      }

      const questionsData = await questionsResponse.json();
      console.log("Debug - Questions data:", questionsData);

      // Process questions from different types
      const allQuestions: Question[] = [];

      if (questionsData.questions.mcq) {
        questionsData.questions.mcq.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            type: "mcq",
            question_text: q.question_text,
            marks: q.marks,
            data: q,
          });
        });
      }

      if (questionsData.questions.saq) {
        questionsData.questions.saq.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            type: "saq",
            question_text: q.question_text,
            marks: q.marks,
            data: q,
          });
        });
      }

      if (questionsData.questions.coding) {
        questionsData.questions.coding.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            type: "coding",
            question_text: q.question_text,
            marks: q.marks,
            data: q,
          });
        });
      }

      setQuestions(allQuestions);
      console.log("Debug - Processed questions:", allQuestions);

      // Check for existing session
      const sessionResponse = await fetch(`/api/exams/${examId}/session`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.session) {
          setSession(sessionData.session);

          if (sessionData.session.status === "in_progress") {
            setExamStarted(true);
            // Calculate remaining time based on session start time and exam duration
            const startTime = new Date(
              sessionData.session.start_time
            ).getTime();
            const now = new Date().getTime();
            const elapsedMinutes = (now - startTime) / (1000 * 60);
            const examDuration = examData.exam.duration || 60; // Default 60 minutes
            const remainingMinutes = Math.max(0, examDuration - elapsedMinutes);
            setTimeRemaining(Math.floor(remainingMinutes * 60));
          }
        }
      }
    } catch (error) {
      console.error("Error loading exam:", error);
      toast.error("Failed to load exam");
      router.push("/student");
    } finally {
      setLoading(false);
    }
  }, [examId, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      loadExamData();
    }
  }, [authLoading, user, loadExamData]);

  // Start exam
  const handleStartExam = async () => {
    try {
      const sessionData = await supabase.auth.getSession();
      if (!sessionData.data.session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/exams/${examId}/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to start exam");
        return;
      }

      const data = await response.json();
      setSession(data.session);
      setExamStarted(true);

      // Set timer based on exam duration
      const examDuration = exam?.duration || 60; // Default 60 minutes
      setTimeRemaining(examDuration * 60); // Convert to seconds

      toast.success("Exam started! Good luck!");
    } catch (error) {
      console.error("Error starting exam:", error);
      toast.error("Failed to start exam");
    }
  };

  // Submit exam
  const handleSubmitExam = async () => {
    try {
      setSubmitting(true);

      const sessionData = await supabase.auth.getSession();
      if (!sessionData.data.session) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/exams/${examId}/session`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.data.session.access_token}`,
        },
        body: JSON.stringify({
          answers,
          status: "completed",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to submit exam");
        return;
      }

      toast.success("Exam submitted successfully!");
      router.push("/student");
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam || !questions.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Exam Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The exam you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button onClick={() => router.push("/student")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {exam.title}
            </h1>
            {exam.description && (
              <p className="text-gray-600 mb-6">{exam.description}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Exam Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Questions:</span>
                  <span className="ml-2 text-gray-600">{questions.length}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">
                    {exam.duration || 60} minutes
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Marks:
                  </span>
                  <span className="ml-2 text-gray-600">
                    {questions.reduce((sum, q) => sum + q.marks, 0)} marks
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Exam Code:</span>
                  <span className="ml-2 text-gray-600">{exam.unique_code}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-yellow-800 mb-2">
                Important Instructions:
              </h4>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>• Make sure you have a stable internet connection</li>
                <li>• Do not refresh or close the browser during the exam</li>
                <li>• The exam will auto-submit when time runs out</li>
                <li>• You can navigate between questions and change answers</li>
                <li>• Click "Submit Exam" when you're done</li>
              </ul>
            </div>

            <Button onClick={handleStartExam} className="px-8 py-3 text-lg">
              Start Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with timer */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {exam.title}
              </h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeRemaining < 300
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                Time: {formatTime(timeRemaining)}
              </div>
              <Button
                onClick={handleSubmitExam}
                loading={submitting}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Question */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Question {currentQuestionIndex + 1}
              </h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                {currentQuestion.marks} marks
              </span>
            </div>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">
              {currentQuestion.question_text}
            </p>

            {/* Answer input based on question type */}
            {currentQuestion.type === "mcq" && (
              <div className="space-y-3">
                {currentQuestion.data.options.map(
                  (option: string, index: number) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={index}
                        checked={answers[currentQuestion.id] === index}
                        onChange={(e) =>
                          handleAnswerChange(
                            currentQuestion.id,
                            parseInt(e.target.value)
                          )
                        }
                        className="mr-3"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  )
                )}
              </div>
            )}

            {currentQuestion.type === "saq" && (
              <textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) =>
                  handleAnswerChange(currentQuestion.id, e.target.value)
                }
                placeholder="Enter your answer here..."
                className="w-full text-black h-32 p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            )}

            {currentQuestion.type === "coding" && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language: {currentQuestion.data.language}
                  </label>
                  {currentQuestion.data.starter_code && (
                    <div className="bg-gray-50 rounded-md p-3 mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Starter Code:
                      </p>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                        {currentQuestion.data.starter_code}
                      </pre>
                    </div>
                  )}
                </div>
                <textarea
                  value={
                    answers[currentQuestion.id] ||
                    currentQuestion.data.starter_code ||
                    ""
                  }
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.id, e.target.value)
                  }
                  placeholder="Write your code here..."
                  className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
              }
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded text-sm font-medium ${
                    index === currentQuestionIndex
                      ? "bg-blue-600 text-white"
                      : answers[questions[index].id] !== undefined
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <Button
              onClick={() =>
                setCurrentQuestionIndex(
                  Math.min(questions.length - 1, currentQuestionIndex + 1)
                )
              }
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
