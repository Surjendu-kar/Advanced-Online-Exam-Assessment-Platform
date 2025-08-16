"use client";

import { useAuthContext } from "../lib/components/AuthProvider";
import { Button } from "../components/ui/Button";
import Link from "next/link";

function HomePage() {
  const { user, loading } = useAuthContext();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Online Exam Platform
        </h1>
        <p className="text-gray-600 mb-8">
          Advanced Online Exam & Assessment Platform
        </p>
        
        {!user ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button variant="primary" size="lg">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">
                  Register
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              Tasks 1-10 Complete: Authentication, Admin, Exam Creation, Question Management
            </p>
            <p className="text-sm text-gray-500">
              Ready for Task 11: Coding Exam Backend with Judge0 Integration
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-700 mb-6">
              Welcome back, {user.profile?.first_name || user.email}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user.profile?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="primary" size="lg">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              
              {user.profile?.role === "teacher" && (
                <Link href="/teacher">
                  <Button variant="primary" size="lg">
                    Teacher Dashboard
                  </Button>
                </Link>
              )}
              
              {user.profile?.role === "student" && (
                <Link href="/student">
                  <Button variant="primary" size="lg">
                    My Exams
                  </Button>
                </Link>
              )}
              
              <Button variant="outline" size="lg" onClick={async () => {
                const { signOut } = await import("../lib/auth");
                await signOut();
                window.location.href = "/";
              }}>
                Sign Out
              </Button>
            </div>
            
            <div className="mt-8 space-y-2">
              <p className="text-sm text-gray-500">
                Tasks 1-10 Complete:
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                <li>Authentication System</li>
                <li>Admin User Management</li>
                <li>Core Exam Creation Backend</li>
                <li>MCQ Question Management</li>
                <li>SAQ Question Management</li>
                <li>Coding Question Management</li>
                <li>Student Invitation Backend</li>
                <li>Student Registration and Exam Access</li>
                <li>MCQ Exam Backend Functionality</li>
                <li>SAQ Exam Backend Functionality</li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                Ready for Task 11: Coding Exam Backend with Judge0 Integration
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;