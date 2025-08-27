"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

interface Question {
  id: string;
  question_text: string;
  question_order: number;
  marks: number;
}

interface MCQQuestion extends Question {
  options: string[];
  correct_option: number;
}

interface SAQQuestion extends Question {
  correct_answer: string;
}

interface CodingQuestion extends Question {
  starter_code: string;
  expected_output: string;
  language: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
}

export default function ExamQuestionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const examId = params.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<{
    mcq: MCQQuestion[];
    saq: SAQQuestion[];
    coding: CodingQuestion[];
  }>({ mcq: [], saq: [], coding: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"mcq" | "saq" | "coding">("mcq");
  const [showForm, setShowForm] = useState(false);

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

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.profile?.role !== "teacher")) {
      router.push("/login");
    } else if (user && user.profile?.role === "teacher") {
      fetchData();
    }
  }, [user, loading, router, examId]);

  const fetchData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const [examRes, questionsRes] = await Promise.all([
        fetch(`/api/exams/${examId}`, {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }),
        fetch(`/api/exams/${examId}/questions`, {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }),
      ]);

      if (examRes.ok) {
        const examData = await examRes.json();
        setExam(examData.exam);
      }

      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.questions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error("Not authenticated");
        return;
      }

      let questionData;
      switch (activeTab) {
        case "mcq":
          questionData = mcqForm;
          break;
        case "saq":
          questionData = saqForm;
          break;
        case "coding":
          questionData = codingForm;
          break;
      }

      const res = await fetch(`/api/exams/${examId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          type: activeTab,
          questionData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create question");
      } else {
        toast.success("Question created successfully!");
        setShowForm(false);
        resetForms();
        fetchData();
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForms = () => {
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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.profile?.role !== "teacher" || !exam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {exam.title} - Questions
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md">
              <button
                onClick={() => setActiveTab("mcq")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "mcq"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                MCQ ({questions.mcq.length})
              </button>
              <button
                onClick={() => setActiveTab("saq")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "saq"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                SAQ ({questions.saq.length})
              </button>
              <button
                onClick={() => setActiveTab("coding")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "coding"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Coding ({questions.coding.length})
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow max-w-lg mx-auto">
              <Button className="w-full" onClick={() => setShowForm(!showForm)}>
                {showForm
                  ? "Cancel"
                  : `Add ${activeTab.toUpperCase()} Question`}
              </Button>
            </div>

            {showForm && (
              <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add {activeTab.toUpperCase()} Question
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {activeTab === "mcq" && (
                    <>
                      <textarea
                        required
                        placeholder="Question Text"
                        value={mcqForm.question_text}
                        onChange={(e) =>
                          setMcqForm({
                            ...mcqForm,
                            question_text: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      />
                      {mcqForm.options.map((option, index) => (
                        <input
                          key={index}
                          required
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...mcqForm.options];
                            newOptions[index] = e.target.value;
                            setMcqForm({ ...mcqForm, options: newOptions });
                          }}
                          className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={submitting}
                        />
                      ))}
                      <select
                        value={mcqForm.correct_option}
                        onChange={(e) =>
                          setMcqForm({
                            ...mcqForm,
                            correct_option: parseInt(e.target.value),
                          })
                        }
                        className="w-full border border-gray-300 p-3 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      >
                        <option value={0}>Option 1 (Correct)</option>
                        <option value={1}>Option 2 (Correct)</option>
                        <option value={2}>Option 3 (Correct)</option>
                        <option value={3}>Option 4 (Correct)</option>
                      </select>
                    </>
                  )}

                  {activeTab === "saq" && (
                    <>
                      <textarea
                        required
                        placeholder="Question Text"
                        value={saqForm.question_text}
                        onChange={(e) =>
                          setSaqForm({
                            ...saqForm,
                            question_text: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      />
                      <textarea
                        required
                        placeholder="Correct Answer"
                        value={saqForm.correct_answer}
                        onChange={(e) =>
                          setSaqForm({
                            ...saqForm,
                            correct_answer: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      />
                    </>
                  )}

                  {activeTab === "coding" && (
                    <>
                      <textarea
                        required
                        placeholder="Question Text"
                        value={codingForm.question_text}
                        onChange={(e) =>
                          setCodingForm({
                            ...codingForm,
                            question_text: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      />
                      <select
                        value={codingForm.language}
                        onChange={(e) =>
                          setCodingForm({
                            ...codingForm,
                            language: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 p-3 rounded-md text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                      <textarea
                        placeholder="Starter Code (Optional)"
                        value={codingForm.starter_code}
                        onChange={(e) =>
                          setCodingForm({
                            ...codingForm,
                            starter_code: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={submitting}
                      />
                      <textarea
                        required
                        placeholder="Expected Output"
                        value={codingForm.expected_output}
                        onChange={(e) =>
                          setCodingForm({
                            ...codingForm,
                            expected_output: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={submitting}
                      />
                    </>
                  )}

                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Marks"
                    value={
                      activeTab === "mcq"
                        ? mcqForm.marks
                        : activeTab === "saq"
                        ? saqForm.marks
                        : codingForm.marks
                    }
                    onChange={(e) => {
                      const marks = parseInt(e.target.value) || 1;
                      if (activeTab === "mcq") {
                        setMcqForm({ ...mcqForm, marks });
                      } else if (activeTab === "saq") {
                        setSaqForm({ ...saqForm, marks });
                      } else {
                        setCodingForm({ ...codingForm, marks });
                      }
                    }}
                    className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    loading={submitting}
                    disabled={submitting}
                  >
                    {submitting ? "Creating..." : "Create Question"}
                  </Button>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab.toUpperCase()} Questions
                </h3>
              </div>
              <div className="p-6">
                {questions[activeTab].length === 0 ? (
                  <div className="text-center text-gray-500">
                    No {activeTab} questions yet. Add some questions to get
                    started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions[activeTab].map((question, index) => (
                      <div
                        key={question.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            Question {index + 1}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {question.marks} marks
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">
                          {question.question_text}
                        </p>
                        {activeTab === "mcq" && (
                          <div className="space-y-1">
                            {(question as MCQQuestion).options.map(
                              (option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`text-sm p-2 rounded ${
                                    (question as MCQQuestion).correct_option ===
                                    optIndex
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {activeTab === "saq" && (
                          <div className="bg-green-100 text-green-800 p-2 rounded text-sm">
                            <strong>Answer:</strong>{" "}
                            {(question as SAQQuestion).correct_answer}
                          </div>
                        )}
                        {activeTab === "coding" && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              Language: {(question as CodingQuestion).language}
                            </div>
                            {(question as CodingQuestion).starter_code && (
                              <div>
                                <div className="text-sm font-medium text-gray-700">
                                  Starter Code:
                                </div>
                                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                  {(question as CodingQuestion).starter_code}
                                </pre>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-700">
                                Expected Output:
                              </div>
                              <pre className="bg-green-100 text-green-800 p-2 rounded text-xs">
                                {(question as CodingQuestion).expected_output}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
