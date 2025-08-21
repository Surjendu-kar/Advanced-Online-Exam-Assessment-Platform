// hooks/useAuth.tsx
"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, logout as authLogout } from "@/lib/auth";
import { AuthUser } from "@/types/database";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "exam_platform_user";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage
  const loadUserFromStorage = () => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          return parsedUser;
        }
      } catch (error) {
        console.error("Error loading user from storage:", error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    return null;
  };

  // Save user to localStorage
  const saveUserToStorage = (userData: AuthUser | null) => {
    if (typeof window !== "undefined") {
      try {
        if (userData) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Error saving user to storage:", error);
      }
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      saveUserToStorage(currentUser);
      return currentUser;
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      saveUserToStorage(null);
      return null;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      saveUserToStorage(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    // First, try to load user from localStorage for immediate UI update
    const storedUser = loadUserFromStorage();
    
    // Then verify the session with Supabase
    const initializeAuth = async () => {
      try {
        // Check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Session exists, refresh user data
          await refreshUser();
        } else if (storedUser) {
          // No session but we have stored user data, clear it
          setUser(null);
          saveUserToStorage(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
        saveUserToStorage(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      
      if (event === "SIGNED_IN" && session?.user) {
        await refreshUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        saveUserToStorage(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Token was refreshed, update user data
        await refreshUser();
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    user,
    loading,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}