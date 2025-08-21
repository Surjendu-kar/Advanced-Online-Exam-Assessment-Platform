// lib/auth.ts
import { supabase } from "./supabaseClient";
import { UserProfile, AuthUser } from "@/types/database";
import { createRouteClient } from "./supabaseRouteClient";
import { toast } from "react-hot-toast";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

// Login function
export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      // Show error toast
      toast.error(error.message);
      return { user: null, error: error.message };
    }

    if (!data.user) {
      toast.error("Login failed");
      return { user: null, error: "Login failed" };
    }

    let profile = await getUserProfile(data.user.id);

    if (!profile && data.user.email) {
      profile = await createUserProfile(
        data.user.id,
        data.user.email,
        "student"
      );
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at,
      profile,
    };

    // Show success toast
    toast.success(`Welcome back, ${profile?.first_name || data.user.email}!`);

    return {
      user: authUser,
      error: null,
    };
  } catch (err) {
    const errorMessage = "An unexpected error occurred";
    toast.error(errorMessage);
    return { user: null, error: errorMessage };
  }
}

// Logout function
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error("Logout failed: " + error.message);
      return { error: error.message };
    }

    // Clear any additional storage if needed
    if (typeof window !== "undefined") {
      localStorage.removeItem("exam_platform_user");
    }

    toast.success("Logged out successfully");
    return { error: null };
  } catch {
    const errorMessage = "An unexpected error occurred during logout";
    toast.error(errorMessage);
    return { error: errorMessage };
  }
}

// Pass Request when in server mode
export async function getCurrentUser(
  server: boolean = false,
  req?: Request
): Promise<AuthUser | null> {
  try {
    const client = server && req ? createRouteClient(req) : supabase;

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) return null;

    let profile = await getUserProfile(user.id);

    if (!profile && user.email) {
      profile = await createUserProfile(user.id, user.email, "student");
    }

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Get user profile from database
export async function getUserProfile(
  userId: string
): Promise<UserProfile | undefined> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return undefined;
    }

    return data as UserProfile;
  } catch (err) {
    console.error("Unexpected error fetching user profile:", err);
    return undefined;
  }
}

// Create user profile (for new users)
export async function createUserProfile(
  userId: string,
  email: string,
  role: "admin" | "teacher" | "student" = "student"
): Promise<UserProfile | undefined> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        role,
        first_name: email.split("@")[0], // Use email prefix as default name
        last_name: "",
        verified: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user profile:", error);
      return undefined;
    }

    return data as UserProfile;
  } catch (err) {
    console.error("Unexpected error creating user profile:", err);
    return undefined;
  }
}

// Check if user has specific role
export function hasRole(
  user: AuthUser | null,
  role: "admin" | "teacher" | "student"
): boolean {
  return user?.profile?.role === role;
}

// Get redirect path based on user role
export function getRedirectPath(user: AuthUser | null): string {
  if (!user?.profile) return "/login";

  switch (user.profile.role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}