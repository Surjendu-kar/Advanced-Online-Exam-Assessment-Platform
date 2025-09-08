"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentResponse: any;
  onGradingComplete: () => void;
}

interface QuestionGrade {
  marks_obtained: number;
  teacher_feedback?: string;
  graded: boolean; // This will be automatically determined
}

export default function GradingModal({
  isOpen,
  onClose,
  studentResponse,
  onGradingComplete,
}: GradingModalProps) {
  const [grades, setGrades] = useState<{ [questionId: string]: QuestionGrade }>(
    {}
  );
  const [originalGrades, setOriginalGrades] = useState<{
    [questionId: string]: QuestionGrade;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && studentResponse) {
      fetchExamQuestions();
      initializeGrades();
    }
  }, [isOpen, studentResponse]);

  const fetchExamQuestions = async () => {
    if (!studentResponse.exam_id) return;

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      // Fetch MCQ questions
      const { data: mcqData } = await supabase
        .from("mcq")
        .select("*")
        .eq("exam_id", studentResponse.exam_id)
        .order("question_order");

      // Fetch SAQ questions
      const { data: saqData } = await supabase
        .from("saq")
        .select("*")
        .eq("exam_id", studentResponse.exam_id)
        .order("question_order");

      // Fetch Coding questions
      const { data: codingData } = await supabase
        .from("coding")
        .select("*")
        .eq("exam_id", studentResponse.exam_id)
        .order("question_order");

      const allQuestions = [
        ...(mcqData || []).map((q) => ({ ...q, type: "mcq" })),
        ...(saqData || []).map((q) => ({ ...q, type: "saq" })),
        ...(codingData || []).map((q) => ({ ...q, type: "coding" })),
      ].sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

      setExamQuestions(allQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const initializeGrades = () => {
    if (!studentResponse.answers) return;

    const initialGrades: { [questionId: string]: QuestionGrade } = {};

    Object.entries(studentResponse.answers).forEach(
      ([questionId, answerData]: [string, any]) => {
        const question = examQuestions.find((q) => q.id === questionId);
        const maxMarks = question?.marks || 0;
        const marksObtained = answerData.marks_obtained || 0;

        // Auto-determine graded status based on whether marks have been assigned
        const isGraded =
          answerData.type === "mcq"
            ? answerData.graded || false // MCQ already auto-graded
            : answerData.graded || false; // Use existing graded flag from database

        initialGrades[questionId] = {
          marks_obtained: marksObtained,
          // Only include teacher_feedback for non-MCQ questions
          ...(answerData.type !== "mcq" && {
            teacher_feedback: answerData.teacher_feedback || "",
          }),
          graded: isGraded,
        };
      }
    );

    setGrades(initialGrades);
    setOriginalGrades(JSON.parse(JSON.stringify(initialGrades))); // Deep copy
    setHasChanges(false);
  };

  const handleGradeChange = (
    questionId: string,
    field: keyof QuestionGrade,
    value: any
  ) => {
    const newGrades = {
      ...grades,
      [questionId]: {
        ...grades[questionId],
        [field]: value,
      },
    };

    // Auto-determine graded status based on marks assignment
    if (field === "marks_obtained") {
      const question = examQuestions.find((q) => q.id === questionId);
      const maxMarks = question?.marks || 0;

      // Question is considered graded if:
      // 1. Marks have been assigned (>= 0) OR
      // 2. It's explicitly marked as 0 marks (teacher reviewed and gave 0)
      newGrades[questionId].graded = value >= 0 && value <= maxMarks;
    }

    setGrades(newGrades);

    // Check if there are any changes compared to original
    const hasActualChanges = Object.keys(newGrades).some((qId) => {
      const current = newGrades[qId];
      const original = originalGrades[qId];

      // Get the question type from studentResponse to check if feedback should be compared
      const questionType = studentResponse.answers?.[qId]?.type;
      const shouldCheckFeedback = questionType !== "mcq";

      return (
        current.marks_obtained !== original.marks_obtained ||
        (shouldCheckFeedback &&
          current.teacher_feedback !== original.teacher_feedback)
        // Note: We don't check graded status as it's automatically determined
      );
    });

    setHasChanges(hasActualChanges);
  };

  const handleSubmitGrades = async () => {
    setSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Not authenticated");
        return;
      }

      const res = await fetch(`/api/exams/${studentResponse.exam_id}/grading`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          responseId: studentResponse.id,
          grades: grades,
        }),
      });

      if (res.ok) {
        toast.success("Grades saved successfully!");
        onGradingComplete();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save grades");
      }
    } catch (error) {
      console.error("Error saving grades:", error);
      toast.error("An error occurred while saving grades");
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionByIdAndType = (questionId: string, type: string) => {
    return examQuestions.find((q) => q.id === questionId && q.type === type);
  };

  const renderAnswer = (questionId: string, answerData: any) => {
    const question = getQuestionByIdAndType(questionId, answerData.type);

    switch (answerData.type) {
      case "mcq":
        const options = question?.options || [];
        const selectedOption = answerData.answer;
        const correctOption = question?.correct_option;

        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Student Answer:</p>
            <div className="grid gap-2">
              {options.map((option: string, index: number) => (
                <div
                  key={index}
                  className={`p-2 rounded border text-black ${
                    index === selectedOption && index === correctOption
                      ? "bg-green-100 border-green-300"
                      : index === selectedOption
                      ? "bg-red-100 border-red-300"
                      : index === correctOption
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="text-sm">
                    {String.fromCharCode(65 + index)}. {option}
                    {index === selectedOption && " (Selected)"}
                    {index === correctOption && " (Correct)"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Auto-graded: {answerData.is_correct ? "Correct" : "Incorrect"}
            </p>
          </div>
        );

      case "saq":
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Student Answer:</p>
            <div className="p-3 bg-gray-50 rounded border ">
              <p className="text-sm whitespace-pre-wrap text-black">
                {answerData.answer || "No answer provided"}
              </p>
            </div>
            {question?.grading_guidelines && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">
                  Grading Guidelines:
                </p>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    {question.grading_guidelines}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case "coding":
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Student Code:</p>
            <div className="p-3 bg-gray-900 text-green-400 rounded border text-black font-mono text-sm overflow-x-auto">
              <pre>{answerData.answer || "No code submitted"}</pre>
            </div>
            {question?.test_cases && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Test Cases:</p>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <pre className="text-xs text-blue-800">
                    {JSON.stringify(question.test_cases, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">Unknown question type</p>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm  bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Grade Student Answers
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {studentResponse.student_name} ({studentResponse.student_email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close grading modal"
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

        <div className="overflow-y-auto max-h-[60vh] p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading questions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(studentResponse.answers || {}).map(
                ([questionId, answerData]: [string, any]) => {
                  const question = getQuestionByIdAndType(
                    questionId,
                    answerData.type
                  );
                  const maxMarks = question?.marks || 0;
                  const currentGrade = grades[questionId] || {
                    marks_obtained: 0,
                    teacher_feedback: "",
                    graded: false,
                  };
                  const originalGrade = originalGrades[questionId] || {
                    marks_obtained: 0,
                    teacher_feedback: "",
                    graded: false,
                  };

                  // Check if this question has been modified (excluding auto-graded status)
                  const isModified =
                    currentGrade.marks_obtained !==
                      originalGrade.marks_obtained ||
                    currentGrade.teacher_feedback !==
                      originalGrade.teacher_feedback;

                  return (
                    <div
                      key={questionId}
                      className={`border rounded-lg p-4 ${
                        isModified
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            Question {answerData.question_number}
                            <span className="ml-2 text-sm text-gray-500">
                              ({answerData.type.toUpperCase()}) - {maxMarks}{" "}
                              marks
                            </span>
                            {isModified && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Modified ✓
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1">
                            {question?.question_text}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentGrade.graded
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {currentGrade.graded ? "Graded" : "Pending"}
                          </span>
                        </div>
                      </div>

                      {renderAnswer(questionId, answerData)}

                      {/* Grading Section */}
                      {answerData.type !== "mcq" && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Marks Obtained (Max: {maxMarks})
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                value={currentGrade.marks_obtained}
                                onChange={(e) =>
                                  handleGradeChange(
                                    questionId,
                                    "marks_obtained",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full text-black border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                aria-label={`Marks obtained for question ${answerData.question_number}`}
                              />
                            </div>
                            <div className="flex items-end">
                              <div className="text-sm">
                                <span className="text-gray-700">
                                  Grading Status:
                                </span>
                                <div
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                    currentGrade.graded
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {currentGrade.graded
                                    ? "✓ Graded"
                                    : "⏳ Pending"}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {currentGrade.graded
                                    ? "Automatically marked as graded when marks are assigned"
                                    : "Assign marks to mark as graded"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Teacher Feedback (Optional)
                            </label>
                            <textarea
                              value={currentGrade.teacher_feedback || ""}
                              onChange={(e) =>
                                handleGradeChange(
                                  questionId,
                                  "teacher_feedback",
                                  e.target.value
                                )
                              }
                              rows={2}
                              className="w-full text-black border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Provide feedback for the student... This will be shown to the student along with their grade."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This feedback will be visible to the student when
                              they view their results.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <div>Current Score: {studentResponse.total_score || 0} marks</div>
            {hasChanges && (
              <div className="text-blue-600 text-xs mt-1">
                ✓ You have unsaved changes
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGrades}
              loading={submitting}
              disabled={submitting || !hasChanges}
            >
              {submitting ? "Saving..." : "Save Grades"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
