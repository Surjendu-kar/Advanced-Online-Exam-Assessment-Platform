"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

interface Question {
  id: string;
  type: "mcq" | "saq" | "coding";
  question_text: string;
  marks: number;
  order: number;
  data: any;
}

interface QuestionAccordionProps {
  question: Question;
  index: number;
  totalQuestions: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onUpdate: (questionId: string, updatedData: any) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  isOpen: boolean;
  onToggle: (questionId: string) => void;
}

function QuestionAccordion({
  question,
  index,
  totalQuestions,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onUpdate,
  isDragging,
  isDropTarget,
  isOpen,
  onToggle,
}: QuestionAccordionProps) {
  const [editData, setEditData] = useState(question.data);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if we're leaving this specific element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragOver(-1); // Reset drag over state
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(index);
  };

  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        isDragging
          ? "opacity-50 transform scale-95 border-blue-300"
          : isDropTarget
          ? "border-blue-400 bg-blue-50"
          : "border-gray-200"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => onToggle(question.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              Q{question.order}
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {question.type.toUpperCase()}
            </span>
            <span className="text-xs text-blue-600 font-medium">
              {question.marks} point{question.marks !== 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="flex items-center space-x-2"
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-in-out ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <button
              draggable
              onDragStart={handleDragStart}
              onDragEnd={onDragEnd}
              className="text-gray-400 hover:text-gray-600 cursor-move hover:bg-gray-100 rounded p-1 transition-colors duration-200"
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
            <button
              onClick={onRemove}
              className="text-red-400 hover:text-red-600 rounded text-lg p-1 hover:bg-red-50 transition-colors duration-200"
              title="Remove question"
            >
              ×
            </button>
          </div>
        </div>
        {!isOpen && (
          <p className="text-sm text-gray-700 line-clamp-2 mt-2">
            {question.question_text}
          </p>
        )}
      </div>

      <div
        className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`p-3 transition-all duration-300 ease-in-out ${
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {question.type === "mcq" && (
            <div className="space-y-3">
              <textarea
                placeholder="Enter question text..."
                value={editData.question_text}
                onChange={(e) =>
                  setEditData({ ...editData, question_text: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {editData.options?.map((option: string, optIndex: number) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <input
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editData.options];
                      newOptions[optIndex] = e.target.value;
                      setEditData({ ...editData, options: newOptions });
                    }}
                    className="flex-1 border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="radio"
                    name="correct_option"
                    checked={editData.correct_option === optIndex}
                    onChange={() =>
                      setEditData({ ...editData, correct_option: optIndex })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              ))}
              <input
                type="number"
                min="1"
                max="100"
                placeholder="Points"
                value={editData.marks}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    marks: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => {
                  onUpdate(question.id, editData);
                  onToggle(question.id);
                }}
                className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Update Question
              </button>
            </div>
          )}

          {question.type === "saq" && (
            <div className="space-y-3">
              <textarea
                placeholder="Enter question text..."
                value={editData.question_text}
                onChange={(e) =>
                  setEditData({ ...editData, question_text: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <textarea
                placeholder="Expected answer..."
                value={editData.correct_answer}
                onChange={(e) =>
                  setEditData({ ...editData, correct_answer: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="number"
                min="1"
                max="100"
                placeholder="Points"
                value={editData.marks}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    marks: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => {
                  onUpdate(question.id, editData);
                  onToggle(question.id);
                }}
                className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Update Question
              </button>
            </div>
          )}

          {question.type === "coding" && (
            <div className="space-y-3">
              <textarea
                placeholder="Enter question text..."
                value={editData.question_text}
                onChange={(e) =>
                  setEditData({ ...editData, question_text: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <select
                value={editData.language}
                onChange={(e) =>
                  setEditData({ ...editData, language: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <textarea
                placeholder="Starter code (optional)..."
                value={editData.starter_code}
                onChange={(e) =>
                  setEditData({ ...editData, starter_code: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
              <textarea
                placeholder="Expected output..."
                value={editData.expected_output}
                onChange={(e) =>
                  setEditData({ ...editData, expected_output: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
              <input
                type="number"
                min="1"
                max="100"
                placeholder="Points"
                value={editData.marks}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    marks: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => {
                  onUpdate(question.id, editData);
                  onToggle(question.id);
                }}
                className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Update Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExamCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExamCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ExamCreateModalProps) {
  const [step, setStep] = useState(1);
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionType, setCurrentQuestionType] = useState<
    "mcq" | "saq" | "coding"
  >("mcq");
  const [submitting, setSubmitting] = useState(false);
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<
    number | null
  >(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  const [mcqForm, setMcqForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option: 0,
    marks: 1,
  });

  const [saqForm, setSaqForm] = useState({
    question_text: "",
    correct_answer: "",
    marks: 1,
  });

  const [codingForm, setCodingForm] = useState({
    question_text: "",
    starter_code: "",
    expected_output: "",
    language: "javascript",
    marks: 1,
  });

  if (!isOpen) return null;

  const resetCurrentForm = () => {
    setMcqForm({
      question_text: "",
      options: ["", "", "", ""],
      correct_option: 0,
      marks: 1,
    });
    setSaqForm({
      question_text: "",
      correct_answer: "",
      marks: 1,
    });
    setCodingForm({
      question_text: "",
      starter_code: "",
      expected_output: "",
      language: "javascript",
      marks: 1,
    });
  };

  const addQuestion = () => {
    let questionData;
    let questionText = "";

    switch (currentQuestionType) {
      case "mcq":
        if (
          !mcqForm.question_text ||
          mcqForm.options.some((opt) => !opt.trim())
        ) {
          toast.error("Please fill all MCQ fields");
          return;
        }
        questionData = { ...mcqForm };
        questionText = mcqForm.question_text;
        break;
      case "saq":
        if (!saqForm.question_text || !saqForm.correct_answer) {
          toast.error("Please fill all SAQ fields");
          return;
        }
        questionData = { ...saqForm };
        questionText = saqForm.question_text;
        break;
      case "coding":
        if (!codingForm.question_text || !codingForm.expected_output) {
          toast.error("Please fill all Coding fields");
          return;
        }
        questionData = { ...codingForm };
        questionText = codingForm.question_text;
        break;
    }

    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: currentQuestionType,
      question_text: questionText,
      marks: questionData.marks,
      order: questions.length + 1,
      data: questionData,
    };

    setQuestions([...questions, newQuestion]);
    resetCurrentForm();
    setShowQuestionForm(false);
    toast.success("Question added!");
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedQuestionIndex(index);
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedQuestionIndex === null || draggedQuestionIndex === dropIndex) {
      setDraggedQuestionIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedQuestionIndex];

    // Remove the dragged question from its original position
    newQuestions.splice(draggedQuestionIndex, 1);

    // Insert it at the new position
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    // Update the order numbers
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });

    setQuestions(newQuestions);
    setDraggedQuestionIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedQuestionIndex(null);
    setDragOverIndex(null);
  };

  const handleAccordionToggle = (questionId: string) => {
    setOpenAccordionId(openAccordionId === questionId ? null : questionId);
  };

  const updateQuestion = (questionId: string, updatedData: any) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, ...updatedData, data: { ...q.data, ...updatedData } }
          : q
      )
    );
  };

  const createExam = async () => {
    if (!examTitle.trim()) {
      toast.error("Please enter exam title");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    setSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Not authenticated");
        return;
      }

      const examRes = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          title: examTitle,
          description: examDescription,
        }),
      });

      const examData = await examRes.json();
      if (!examRes.ok) {
        toast.error(examData.error || "Failed to create exam");
        return;
      }

      const examId = examData.exam.id;

      for (const question of questions) {
        const questionRes = await fetch(`/api/exams/${examId}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            type: question.type,
            questionData: {
              ...question.data,
              question_order: question.order,
            },
          }),
        });

        if (!questionRes.ok) {
          const errorData = await questionRes.json();
          toast.error(
            `Failed to create question ${question.order}: ${errorData.error}`
          );
          return;
        }
      }

      toast.success(`Exam "${examTitle}" created successfully!`);
      onSuccess();
      onClose();
      resetModal();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setExamTitle("");
    setExamDescription("");
    setQuestions([]);
    resetCurrentForm();
  };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
          margin: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
          margin: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .scrollbar-thin {
          scrollbar-gutter: stable;
        }
      `}</style>
      <div
        className={`bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-xl flex flex-col ${
          step !== 1 ? "h-[85vh]" : "h-auto"
        }`}
      >
        <div className="px-4 py-2  border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 1 ? (
                "Create New Exam"
              ) : (
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center text-gray-900 hover:text-blue-600 hover:bg-gray-100 px-3 py-2 rounded-full transition-all duration-200"
                >
                  ←
                </button>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 hover:bg-gray-100 px-3 py-2 rounded-full transition-all duration-200"
              title="Create New Exam"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-4 py-2">
          {step === 1 && (
            <div className="space-y-4 py-2">
              <input
                type="text"
                required
                placeholder="Exam Title"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                placeholder="Exam Description (Optional)"
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 h-full overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-3 pt-4 h-full">
                {/* Left Side - Question Type, Add Button, and Question Forms */}
                <div className="space-y-4 sticky top-0 self-start h-fit max-h-[calc(85vh-200px)] pb-4 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Type
                    </label>
                    <select
                      value={currentQuestionType}
                      onChange={(e) =>
                        setCurrentQuestionType(
                          e.target.value as "mcq" | "saq" | "coding"
                        )
                      }
                      className="w-full border border-gray-300 p-3 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="saq">Short Answer (SAQ)</option>
                      <option value="coding">Coding Challenge</option>
                    </select>
                  </div>

                  <Button
                    onClick={() => setShowQuestionForm(!showQuestionForm)}
                    className="w-full"
                  >
                    {showQuestionForm
                      ? "Cancel"
                      : `Add ${currentQuestionType.toUpperCase()} Question`}
                  </Button>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      value={totalMarks}
                      disabled
                      className="w-full border border-gray-300 p-3 rounded-md text-black bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Right Side - Added Questions or Question Form */}
                <div className="space-y-4 pb-4 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-3">
                  {showQuestionForm ? (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <h4 className="font-medium text-gray-900">
                        New {currentQuestionType.toUpperCase()} Question
                      </h4>

                      {currentQuestionType === "mcq" && (
                        <div className="space-y-3">
                          <textarea
                            required
                            placeholder="Enter question text..."
                            value={mcqForm.question_text}
                            onChange={(e) =>
                              setMcqForm({
                                ...mcqForm,
                                question_text: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          {mcqForm.options.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <input
                                required
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...mcqForm.options];
                                  newOptions[index] = e.target.value;
                                  setMcqForm({
                                    ...mcqForm,
                                    options: newOptions,
                                  });
                                }}
                                className="flex-1 border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                              <input
                                type="radio"
                                name="correct_option_form"
                                checked={mcqForm.correct_option === index}
                                onChange={() =>
                                  setMcqForm({
                                    ...mcqForm,
                                    correct_option: index,
                                  })
                                }
                                className="w-4 h-4 text-blue-600"
                              />
                            </div>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Points"
                            value={mcqForm.marks}
                            onChange={(e) =>
                              setMcqForm({
                                ...mcqForm,
                                marks: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}

                      {currentQuestionType === "saq" && (
                        <div className="space-y-3">
                          <textarea
                            required
                            placeholder="Enter question text..."
                            value={saqForm.question_text}
                            onChange={(e) =>
                              setSaqForm({
                                ...saqForm,
                                question_text: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <textarea
                            required
                            placeholder="Expected answer..."
                            value={saqForm.correct_answer}
                            onChange={(e) =>
                              setSaqForm({
                                ...saqForm,
                                correct_answer: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Points"
                            value={saqForm.marks}
                            onChange={(e) =>
                              setSaqForm({
                                ...saqForm,
                                marks: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}

                      {currentQuestionType === "coding" && (
                        <div className="space-y-3">
                          <textarea
                            required
                            placeholder="Enter question text..."
                            value={codingForm.question_text}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                question_text: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <select
                            value={codingForm.language}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                language: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 p-2 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                          </select>
                          <textarea
                            placeholder="Starter code (optional)..."
                            value={codingForm.starter_code}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                starter_code: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                          />
                          <textarea
                            required
                            placeholder="Expected output..."
                            value={codingForm.expected_output}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                expected_output: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                          />
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Points"
                            value={codingForm.marks}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                marks: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}

                      <Button onClick={addQuestion} className="w-full">
                        Add {currentQuestionType.toUpperCase()} Question
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium text-gray-900">
                        Questions ({questions.length} questions)
                      </h4>
                      {questions.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No questions added yet. Click "Add Question" to get
                          started.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {questions.map((question, index) => (
                            <QuestionAccordion
                              key={question.id}
                              question={question}
                              index={index}
                              totalQuestions={questions.length}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              onDragEnd={handleDragEnd}
                              onRemove={() => removeQuestion(question.id)}
                              onUpdate={updateQuestion}
                              isDragging={draggedQuestionIndex === index}
                              isDropTarget={
                                dragOverIndex === index &&
                                draggedQuestionIndex !== index
                              }
                              isOpen={openAccordionId === question.id}
                              onToggle={handleAccordionToggle}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {step === 1 && (
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!examTitle.trim()}>
                Next: Add Questions
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  resetModal();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createExam}
                loading={submitting}
                disabled={submitting || questions.length === 0}
              >
                {submitting ? "Creating Exam..." : "Create Exam"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
