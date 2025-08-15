import { AuthUser, UserProfile } from "../../types/database";

/**
 * Authentication utility functions
 */

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: AuthUser | null): boolean {
  return user !== null && user.id !== undefined;
}

/**
 * Check if user has specific role
 */
export function hasRole(
  user: AuthUser | null,
  role: UserProfile["role"]
): boolean {
  return user?.profile?.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  user: AuthUser | null,
  roles: UserProfile["role"][]
): boolean {
  return user?.profile?.role ? roles.includes(user.profile.role) : false;
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "Guest";

  const profile = user.profile;
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  if (profile?.first_name) {
    return profile.first_name;
  }

  return user.email || "User";
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: AuthUser | null): string {
  if (!user) return "G";

  const profile = user.profile;
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  }

  if (profile?.first_name) {
    return profile.first_name[0].toUpperCase();
  }

  if (user.email) {
    return user.email[0].toUpperCase();
  }

  return "U";
}

/**
 * Format role for display
 */
export function formatRole(role: UserProfile["role"]): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return "User";
  }
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(user: AuthUser | null): boolean {
  return hasRole(user, "admin");
}

/**
 * Check if user can access teacher features
 */
export function canAccessTeacher(user: AuthUser | null): boolean {
  return hasAnyRole(user, ["admin", "teacher"]);
}

/**
 * Check if user can access student features
 */
export function canAccessStudent(user: AuthUser | null): boolean {
  return hasRole(user, "student");
}

/**
 * Get redirect path based on user role
 */
export function getDefaultRedirectPath(user: AuthUser | null): string {
  if (!user?.profile?.role) return "/";

  switch (user.profile.role) {
    case "admin":
      return "/admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/dashboard";
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() / 1000 > expiresAt;
}

/**
 * Format session expiry time
 */
export function formatSessionExpiry(expiresAt: number): string {
  const expiryDate = new Date(expiresAt * 1000);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Expired";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }

  if (diffHours > 0) {
    return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  }

  return `Expires in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
}
