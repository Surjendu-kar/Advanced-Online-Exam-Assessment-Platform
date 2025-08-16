"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "../../lib/components/AuthProvider";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

interface Teacher {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  institution?: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, loading } = useAuthContext();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherFirstName, setNewTeacherFirstName] = useState("");
  const [newTeacherLastName, setNewTeacherLastName] = useState("");
  const [newTeacherInstitution, setNewTeacherInstitution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is admin
  useEffect(() => {
    if (!loading && user && user.profile?.role !== "admin") {
      // Redirect non-admin users
      window.location.href = "/";
    }
  }, [user, loading]);
  
  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      if (!user || user.profile?.role !== "admin") return;
      
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/teachers");
        const data = await response.json();
        
        if (response.ok) {
          setTeachers(data.data || []);
        } else {
          setError(data.error || "Failed to fetch teachers");
        }
      } catch (err) {
        setError("Failed to fetch teachers");
        console.error("Fetch teachers error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user && !loading) {
      fetchTeachers();
    }
  }, [user, loading]);
  
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newTeacherEmail.trim(),
          first_name: newTeacherFirstName.trim(),
          last_name: newTeacherLastName.trim(),
          institution: newTeacherInstitution.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Add new teacher to list
        setTeachers([...teachers, data.data]);
        // Reset form
        setNewTeacherEmail("");
        setNewTeacherFirstName("");
        setNewTeacherLastName("");
        setNewTeacherInstitution("");
      } else {
        setError(data.error || "Failed to create teacher account");
      }
    } catch (err) {
      setError("Failed to create teacher account");
      console.error("Create teacher error:", err);
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
  
  if (user.profile?.role !== "admin") {
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
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage teacher accounts and platform settings
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Teacher Form */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Create Teacher Account</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="First Name"
                      type="text"
                      value={newTeacherFirstName}
                      onChange={(e) => setNewTeacherFirstName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Last Name"
                      type="text"
                      value={newTeacherLastName}
                      onChange={(e) => setNewTeacherLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Institution"
                    type="text"
                    value={newTeacherInstitution}
                    onChange={(e) => setNewTeacherInstitution(e.target.value)}
                  />
                </div>
                
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Teacher Account"}
                </Button>
              </form>
            </div>
          </div>
          
          {/* Teachers List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Teachers</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading teachers...</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No teachers found. Create your first teacher account!
                </div>
              ) : (
                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <Card key={teacher.id}>
                      <CardHeader>
                        <h3 className="text-lg font-medium text-gray-900">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span> {teacher.email}
                          </p>
                          {teacher.institution && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Institution:</span> {teacher.institution}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Created:</span> {
                              new Date(teacher.created_at).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}