import { supabase, SupabaseError } from "../supabaseClient";
import { AuthUser, UserProfile } from "../../types/database";
import { EmailService } from "./emailService";

export interface CreateUserRequest {
  email: string;
  password: string;
  role: "teacher" | "student";
  first_name?: string;
  last_name?: string;
  institution?: string;
  created_by: string;
}

export interface GetUsersOptions {
  role?: UserProfile["role"];
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetUsersResponse {
  data: AuthUser[];
  count: number;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  institution?: string;
  verified?: boolean;
}

/**
 * Admin service for user management operations
 * Only accessible by users with admin role
 */
export class AdminService {
  /**
   * Create a new user account (teacher or student)
   */
  static async createUser(request: CreateUserRequest): Promise<AuthUser> {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(
        (u) => u.email === request.email
      );

      if (existingUser) {
        throw new SupabaseError(
          "User with this email already registered",
          "USER_EXISTS"
        );
      }

      // Create auth user using admin API
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: request.email,
          password: request.password,
          email_confirm: true, // Auto-confirm email for admin-created users
        });

      if (authError || !authData.user) {
        throw new SupabaseError(
          authError?.message || "Failed to create user account",
          "USER_CREATE_ERROR"
        );
      }

      // Create user profile
      const profileData: Partial<UserProfile> = {
        id: authData.user.id,
        role: request.role,
        first_name: request.first_name,
        last_name: request.last_name,
        institution: request.institution,
        created_by: request.created_by,
        verified: true,
      };

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        // Cleanup: delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new SupabaseError(profileError.message, "PROFILE_CREATE_ERROR");
      }

      const newUser: AuthUser = {
        ...authData.user,
        profile,
      };

      // Send welcome email for teachers
      if (request.role === "teacher") {
        try {
          await EmailService.sendTeacherWelcomeEmail({
            email: request.email,
            firstName: request.first_name || "Teacher",
            password: request.password,
          });
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't fail the user creation if email fails
        }
      }

      return newUser;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to create user", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get paginated list of users with optional filtering
   */
  static async getUsers(
    options: GetUsersOptions = {}
  ): Promise<GetUsersResponse> {
    try {
      const { role, page = 1, limit = 10, search } = options;
      const offset = (page - 1) * limit;

      let query = supabase.from("user_profiles").select(
        `
          id,
          role,
          first_name,
          last_name,
          institution,
          verified,
          created_at,
          updated_at,
          created_by
        `,
        { count: "exact" }
      );

      // Apply role filter
      if (role) {
        query = query.eq("role", role);
      }

      // Apply search filter
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,institution.ilike.%${search}%`
        );
      }

      // Apply pagination
      query = query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      const { data: profiles, error, count } = await query;

      if (error) {
        throw new SupabaseError(error.message, "USERS_FETCH_ERROR");
      }

      // Get auth user data for each profile
      const users: AuthUser[] = [];

      if (profiles) {
        for (const profile of profiles) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(
              profile.id
            );

            if (authUser.user) {
              users.push({
                ...authUser.user,
                profile,
              });
            }
          } catch (error) {
            console.error(
              `Failed to fetch auth data for user ${profile.id}:`,
              error
            );
            // Continue with other users even if one fails
          }
        }
      }

      return {
        data: users,
        count: count || 0,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to fetch users", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Get user by ID with profile
   */
  static async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          return null; // User not found
        }
        throw new SupabaseError(profileError.message, "PROFILE_FETCH_ERROR");
      }

      // Get auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.getUserById(userId);

      if (authError || !authData.user) {
        throw new SupabaseError(
          authError?.message || "User not found",
          "USER_FETCH_ERROR"
        );
      }

      return {
        ...authData.user,
        profile,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to fetch user", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string,
    updates: UpdateUserRequest
  ): Promise<AuthUser> {
    try {
      // Update profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (profileError) {
        throw new SupabaseError(profileError.message, "PROFILE_UPDATE_ERROR");
      }

      // Get updated auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.getUserById(userId);

      if (authError || !authData.user) {
        throw new SupabaseError(
          authError?.message || "Failed to fetch updated user",
          "USER_FETCH_ERROR"
        );
      }

      return {
        ...authData.user,
        profile,
      };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError("Failed to update user", "UNKNOWN_ERROR", error);
    }
  }

  /**
   * Deactivate user (soft delete by setting verified to false)
   */
  static async deactivateUser(userId: string): Promise<void> {
    try {
      // Update profile to mark as unverified
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        throw new SupabaseError(profileError.message, "USER_DEACTIVATE_ERROR");
      }

      // Note: We don't delete the auth user to preserve data integrity
      // The user is effectively deactivated by setting verified to false
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to deactivate user",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Get teacher statistics
   */
  static async getTeacherStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("verified")
        .eq("role", "teacher");

      if (error) {
        throw new SupabaseError(error.message, "STATS_FETCH_ERROR");
      }

      const total = data?.length || 0;
      const active = data?.filter((profile) => profile.verified).length || 0;
      const inactive = total - active;

      return { total, active, inactive };
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      throw new SupabaseError(
        "Failed to fetch teacher statistics",
        "UNKNOWN_ERROR",
        error
      );
    }
  }

  /**
   * Verify admin role for current user
   */
  static async verifyAdminRole(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        return false;
      }

      return profile?.role === "admin";
    } catch {
      return false;
    }
  }
}
