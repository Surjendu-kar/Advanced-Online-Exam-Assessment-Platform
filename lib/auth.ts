import { supabase } from "./supabaseClient";
import { UserProfile, AuthUser } from "@/types/database";

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
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "Login failed" };
    }

    // Get user profile, create if doesn't exist
    let profile = await getUserProfile(data.user.id);

    if (!profile && data.user.email) {
      // Create profile for new user (default to student role)
      profile = await createUserProfile(
        data.user.id,
        data.user.email,
        "student"
      );
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
        profile,
      },
      error: null,
    };
  } catch {
    return { user: null, error: "An unexpected error occurred" };
  }
}

// Logout function
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch {
    return { error: "An unexpected error occurred during logout" };
  }
}

// Get current user session
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Get user profile, create if doesn't exist
    let profile = await getUserProfile(user.id);

    if (!profile && user.email) {
      // Create profile for existing user (default to student role)
      profile = await createUserProfile(user.id, user.email, "student");
    }

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile,
    };
  } catch {
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
