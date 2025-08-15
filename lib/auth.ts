import {
  supabase,
  SupabaseError,
  handleSupabaseResponse,
} from "./supabaseClient";
import { AuthUser, UserProfile } from "../types/database";
import { Session } from "@supabase/supabase-js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
}

export interface AuthError {
  message: string;
  code?: string;
}

/**
 * Authentication service for the Online Exam Platform
 * Handles login, logout, session management, and user profile operations
 */
export class AuthService {
  /**
   * Sign in user with email and password
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });

      if (error) {
        throw new SupabaseError(
          error.message,
          error.message.includes("Invalid login credentials")
            ? "INVALID_CREDENTIALS"
            : "AUTH_ERROR"
        );
      }

      if (!data.user) {
        throw new SupabaseError("Authentication failed", "AUTH_FAILED");
      }

      // Fetch user profile
      const profile = await this.getUserProfile(data.user.id);

      return {
        user: {
          ...data.user,
          profile,
        },
        session: data.session,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Authentication failed", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new SupabaseError(error.message, "SIGNOUT_ERROR");
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Sign out failed", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new SupabaseError(error.message, "SESSION_ERROR");
      }
      return data.session;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to get session", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get current user with profile
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        throw new SupabaseError(error.message, "USER_ERROR");
      }

      if (!data.user) {
        return null;
      }

      // Fetch user profile
      const profile = await this.getUserProfile(data.user.id);

      return {
        ...data.user,
        profile,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get current user",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get user profile by user ID
   */
  static async getUserProfile(
    userId: string
  ): Promise<UserProfile | undefined> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If profile doesn't exist, return undefined (not an error)
        if (error.code === "PGRST116") {
          return undefined;
        }
        throw new SupabaseError(error.message, "PROFILE_ERROR");
      }

      return data;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to get user profile",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Create user profile (used during registration)
   */
  static async createUserProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          role: profileData.role || "student",
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          institution: profileData.institution,
          created_by: profileData.created_by,
          verified: profileData.verified ?? true,
        })
        .select()
        .single();

      return handleSupabaseResponse({ data, error });
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to create user profile",
        "PROFILE_CREATE_ERROR",
        error
      );
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      return handleSupabaseResponse({ data, error });
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to update user profile",
        "PROFILE_UPDATE_ERROR",
        error
      );
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(
    userId: string,
    role: UserProfile["role"]
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.role === role;
    } catch {
      return false;
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw new SupabaseError(error.message, "REFRESH_ERROR");
      }
      return data.session;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to refresh session",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(
    callback: (user: AuthUser | null, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      let user: AuthUser | null = null;

      if (session?.user) {
        try {
          const profile = await this.getUserProfile(session.user.id);
          user = {
            ...session.user,
            profile,
          };
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          user = session.user as AuthUser;
        }
      }

      callback(user, session);
    });
  }
}

// Export convenience functions
export const {
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  hasRole,
  refreshSession,
  onAuthStateChange,
} = AuthService;
