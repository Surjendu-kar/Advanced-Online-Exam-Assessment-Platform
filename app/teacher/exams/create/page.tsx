"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../../../lib/components/AuthProvider";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../../components/ui/Card";

interface ExamFormData {
  title: string;
  description: string;
  duration: number;
  start_time: string;
  end_time: string;
  access_type: "invitation" | "code" | "open";
  max_attempts: number;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  require_webcam: boolean;
  max_violations: number;
}

export default function CreateExamPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    description: "",
    duration: 60,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
    access_type: "invitation",
    max_attempts: 1,
    shuffle_questions: false,
    show_results_immediately: false,
    require_webcam: false,
    max_violations: 3,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration.toString()),
          max_attempts: parseInt(formData.max_attempts.toString()),
          max_violations: parseInt(formData.max_violations.toString()),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to exam details page
        router.push(`/teacher/exams/${data.data.id}/questions`);
      } else {
        setError(data.error || "Failed to create exam");
      }
    } catch (err) {
      setError("Failed to create exam");
      console.error("Create exam error:", err);
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
            Create New Exam
          </h1>
          <p className="mt-2 text-gray-600">
            Set up the basic information for your exam
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Exam Details</h2>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  label="Exam Title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Duration (minutes)"
                    name="duration"
                    type="number"
                    min="1"
                    required
                    value={formData.duration}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Type
                  </label>
                  <select
                    name="access_type"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.access_type}
                    onChange={handleChange}
                  >
                    <option value="invitation">Invitation Only</option>
                    <option value="code">Exam Code</option>
                    <option value="open">Open Access</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    name="start_time"
                    type="datetime-local"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.start_time}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    name="end_time"
                    type="datetime-local"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.end_time}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Max Attempts"
                    name="max_attempts"
                    type="number"
                    min="1"
                    required
                    value={formData.max_attempts}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <Input
                    label="Max Violations"
                    name="max_violations"
                    type="number"
                    min="1"
                    required
                    value={formData.max_violations}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    name="shuffle_questions"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.shuffle_questions}
                    onChange={handleChange}
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Shuffle Questions
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    name="show_results_immediately"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.show_results_immediately}
                    onChange={handleChange}
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Show Results Immediately
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    name="require_webcam"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.require_webcam}
                    onChange={handleChange}
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Require Webcam
                  </label>
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
              {isSubmitting ? "Creating..." : "Create Exam"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}