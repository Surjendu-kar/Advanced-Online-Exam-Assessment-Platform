"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth, UseAuthReturn } from "../hooks/useAuth";
import { ErrorBoundary } from "./ErrorBoundary";

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 * Provides authentication state and methods to the entire app
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 mb-4">
              Failed to initialize authentication system
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      }
    >
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </ErrorBoundary>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

/**
 * Loading component for authentication states
 */
export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Component to protect routes that require authentication
 */
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return fallback || <AuthLoading />;
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

  return <>{children}</>;
}
