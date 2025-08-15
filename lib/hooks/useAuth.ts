"use client";

import { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { AuthService } from "../auth";
import { AuthUser, UserProfile } from "../../types/database";

export interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserProfile["role"]) => boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

/**
 * Custom hook for authentication state management
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        const currentSession = await AuthService.getSession();

        if (mounted) {
          setUser(currentUser);
          setSession(currentSession);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = AuthService.onAuthStateChange((authUser, authSession) => {
      if (mounted) {
        setUser(authUser);
        setSession(authSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await AuthService.signIn({ email, password });
      setUser(response.user);
      setSession(response.session);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [session?.user?.id]);

  // Role checking utilities
  const hasRole = useCallback(
    (role: UserProfile["role"]) => {
      return user?.profile?.role === role;
    },
    [user?.profile?.role]
  );

  const isAdmin = hasRole("admin");
  const isTeacher = hasRole("teacher") || isAdmin;
  const isStudent = hasRole("student");

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUser,
    hasRole,
    isAdmin,
    isTeacher,
    isStudent,
  };
}
