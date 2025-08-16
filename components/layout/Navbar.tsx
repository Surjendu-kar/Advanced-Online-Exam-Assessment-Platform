"use client";

import React from "react";
import Link from "next/link";
import { useAuthContext } from "../../lib/components/AuthProvider";
import { Button } from "../ui/Button";

export function Navbar() {
  const { user, profile, signOut } = useAuthContext();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Online Exam Platform
              </h1>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {profile?.first_name || user.email}
                  </span>
                  {profile?.role && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {profile.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {profile?.role === "admin" && (
                    <Link href="/admin">
                      <Button variant="ghost" size="sm">
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  {profile?.role === "teacher" && (
                    <Link href="/teacher">
                      <Button variant="ghost" size="sm">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  {profile?.role === "student" && (
                    <Link href="/student">
                      <Button variant="ghost" size="sm">
                        My Exams
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
