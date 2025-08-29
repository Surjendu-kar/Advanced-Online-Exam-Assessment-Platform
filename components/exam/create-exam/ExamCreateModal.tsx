"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import ExamModalHeader from "./ExamModalHeader";
import ExamBasicInfo from "./ExamBasicInfo";
import QuestionAccordion, { Question } from "./QuestionAccordion";
import ExamModalFooter from "./ExamModalFooter";

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
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [newlyAddedQuestions, setNewlyAddedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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

    const questionId = Math.random().toString(36).substr(2, 9);
    const newQuestion: Question = {
      id: questionId,
      type: currentQuestionType,
      question_text: questionText,
      marks: questionData.marks,
      order: questions.length + 1,
      data: questionData,
    };

    setQuestions([...questions, newQuestion]);
    resetCurrentForm();
    setShowQuestionForm(false);

    // Mark as newly added and remove after animation
    setNewlyAddedQuestions(new Set([questionId]));
    setTimeout(() => {
      setNewlyAddedQuestions(new Set());
    }, 0);

    toast.success("Question added!");
  };

  const removeQuestion = (id: string) => {
    const updatedQuestions = questions.filter((q) => q.id !== id);
    // Update order numbers after deletion
    updatedQuestions.forEach((q, i) => {
      q.order = i + 1;
    });
    setQuestions(updatedQuestions);
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

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedQuestions(new Set());
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const deleteSelectedQuestions = () => {
    if (selectedQuestions.size === questions.length) {
      // If deleting all questions, set flag and delay the actual deletion
      setIsDeletingAll(true);
      setTimeout(() => {
        setQuestions([]);
        setSelectedQuestions(new Set());
        setIsDeleteMode(false);
        setIsDeletingAll(false);
      }, 250); // Allow time for exit animations
    } else {
      // Normal deletion for partial selection
      const updatedQuestions = questions.filter((q) => !selectedQuestions.has(q.id));
      // Update order numbers after deletion
      updatedQuestions.forEach((q, i) => {
        q.order = i + 1;
      });
      setQuestions(updatedQuestions);
      setSelectedQuestions(new Set());
      setIsDeleteMode(false);
    }
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
      <motion.div
        layout
        className={`bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-xl flex flex-col ${
          step !== 1 ? "h-[85vh]" : "h-auto"
        }`}
        transition={{
          layout: {
            duration: 0.3,
            ease: "easeInOut",
          },
        }}
      >
        <ExamModalHeader
          step={step}
          onGoBack={() => setStep(1)}
          onClose={onClose}
        />
        <div className="flex-1 overflow-hidden px-4 py-2">
          {step === 1 && (
            <ExamBasicInfo
              examTitle={examTitle}
              examDescription={examDescription}
              onTitleChange={setExamTitle}
              onDescriptionChange={setExamDescription}
            />
          )}

          {step === 2 && (
            <div className="space-y-6 h-full overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pl-3 pt-4 h-full">
                {/* Left Side - Question Type, Add Button, and Question Forms */}
                <div className="space-y-4 sticky top-0 self-start h-fit max-h-[calc(85vh-200px)] pl-1 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                      className="w-full border border-gray-300 p-3 rounded-md text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
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

                  <div className="">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      value={totalMarks}
                      disabled
                      className="w-full border border-gray-300 p-3 rounded-md text-black bg-gray-50  cursor-not-allowed"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                                className="flex-1 border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                          />
                          <select
                            value={codingForm.language}
                            onChange={(e) =>
                              setCodingForm({
                                ...codingForm,
                                language: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 p-2 rounded-md text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm font-mono"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm font-mono"
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
                            className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      <Button onClick={addQuestion} className="w-full">
                        Add {currentQuestionType.toUpperCase()} Question
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900">
                          Questions ({questions.length} questions)
                        </h4>
                        <div className="flex items-center space-x-2">
                          {isDeleteMode && selectedQuestions.size > 0 && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={deleteSelectedQuestions}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                            >
                              Delete ({selectedQuestions.size})
                            </motion.button>
                          )}
                          {isDeleteMode && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={toggleDeleteMode}
                              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </motion.button>
                          )}
                          <button
                            onClick={toggleDeleteMode}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              isDeleteMode
                                ? "hidden"
                                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                            title="Delete questions"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {questions.length === 0 && !isDeletingAll ? (
                        <div className="text-center text-gray-500 py-8">
                          No questions added yet. Click "Add Question" to get
                          started.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <AnimatePresence mode="popLayout">
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
                                isDeleteMode={isDeleteMode}
                                isSelected={selectedQuestions.has(question.id)}
                                onToggleSelection={toggleQuestionSelection}
                                isNewlyAdded={newlyAddedQuestions.has(
                                  question.id
                                )}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <ExamModalFooter
          step={step}
          examTitle={examTitle}
          questionsCount={questions.length}
          submitting={submitting}
          onNextStep={() => setStep(2)}
          onCreateExam={createExam}
          onCancel={() => {
            onClose();
            resetModal();
          }}
        />
      </motion.div>
    </div>
  );
}
