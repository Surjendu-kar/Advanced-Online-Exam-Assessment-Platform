"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface StudentResultsProps {
  examId: string;
  studentId: string;
}

interface QuestionResult {
  id: string;
  question_number: number;
  question_text: string;
  type: string;
  marks: number;
  student_answer: any;
  marks_obtained: number;
  teacher_feedback?: string;
  is_correct?: boolean;
}

export default function StudentResults({
  examId,
  studentId,
}: StudentResultsProps) {
  const [results, setResults] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentResults();
  }, [examId, studentId]);

  const fetchStudentResults = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      // Fetch student response
      const { data: response } = await supabase
        .from("student_responses")
        .select("*")
        .eq("exam_id", examId)
        .eq("student_id", studentId)
        .single();

      if (response) {
        setResults(response);

        // Convert answers to question results format
        const questionResults: QuestionResult[] = [];

        for (const [questionId, answerData] of Object.entries(
          response.answers as any
        )) {
          const answer = answerData as any;
          questionResults.push({
            id: questionId,
            question_number: answer.question_number,
            question_text: "", // Would need to fetch from question tables
            type: answer.type,
            marks: 0, // Would need to fetch from question tables
            student_answer: answer.answer,
            marks_obtained: answer.marks_obtained || 0,
            teacher_feedback: answer.teacher_feedback,
            is_correct: answer.is_correct,
          });
        }

        questionResults.sort((a, b) => a.question_number - b.question_number);
        setQuestions(questionResults);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No results found for this exam.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Exam Results</h2>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <span>
              Total Score: <strong>{results.total_score}</strong> /{" "}
              {results.max_possible_score}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                results.grading_status === "completed"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {results.grading_status === "completed"
                ? "Fully Graded"
                : "Grading in Progress"}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {questions.map((question) => (
              <div
                key={question.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Question {question.question_number}
                    <span className="ml-2 text-sm text-gray-500">
                      ({question.type.toUpperCase()})
                    </span>
                  </h3>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {question.marks_obtained} / {question.marks} marks
                    </div>
                    {question.type === "mcq" && (
                      <div
                        className={`text-xs font-medium ${
                          question.is_correct
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {question.is_correct ? "Correct" : "Incorrect"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Your Answer:
                  </p>
                  <div className="p-3 bg-gray-50 rounded border">
                    {question.type === "mcq" ? (
                      <p className="text-sm">
                        Option {question.student_answer + 1}
                      </p>
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap">
                        {question.student_answer}
                      </pre>
                    )}
                  </div>
                </div>

                {question.teacher_feedback && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Teacher Feedback:
                    </p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        {question.teacher_feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
