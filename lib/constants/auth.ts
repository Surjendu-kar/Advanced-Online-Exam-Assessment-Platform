/**
 * Authentication constants for the Online Exam Platform
 */

// Session configuration
export const SESSION_CONFIG = {
  REFRESH_THRESHOLD: 5 * 60, // Refresh session when 5 minutes left
  MAX_IDLE_TIME: 30 * 60, // 30 minutes idle timeout
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60, // 30 days in seconds
} as const;

// Route paths
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  UNAUTHORIZED: "/unauthorized",
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    USERS: "/admin/users",
    SETTINGS: "/admin/settings",
  },
  TEACHER: {
    DASHBOARD: "/teacher/dashboard",
    EXAMS: "/teacher/exams",
    CREATE_EXAM: "/teacher/create-exam",
    GRADING: "/teacher/grading",
    ANALYTICS: "/teacher/analytics",
  },
  STUDENT: {
    DASHBOARD: "/student/dashboard",
    EXAMS: "/student/exams",
    RESULTS: "/student/results",
    LEADERBOARD: "/student/leaderboard",
  },
  EXAM: "/exam",
} as const;

// Error codes
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  EMAIL_NOT_CONFIRMED: "EMAIL_NOT_CONFIRMED",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

// Error messages
export const AUTH_ERROR_MESSAGES = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: "Invalid email or password",
  [AUTH_ERRORS.USER_NOT_FOUND]: "User not found",
  [AUTH_ERRORS.EMAIL_NOT_CONFIRMED]: "Please confirm your email address",
  [AUTH_ERRORS.WEAK_PASSWORD]: "Password is too weak",
  [AUTH_ERRORS.EMAIL_ALREADY_EXISTS]:
    "An account with this email already exists",
  [AUTH_ERRORS.SESSION_EXPIRED]:
    "Your session has expired. Please log in again",
  [AUTH_ERRORS.UNAUTHORIZED]: "You are not authorized to access this resource",
  [AUTH_ERRORS.FORBIDDEN]: "Access denied",
  [AUTH_ERRORS.NETWORK_ERROR]: "Network error. Please check your connection",
  [AUTH_ERRORS.UNKNOWN_ERROR]: "An unexpected error occurred",
} as const;

// Role permissions
export const ROLE_PERMISSIONS = {
  admin: [
    "manage_users",
    "manage_exams",
    "view_analytics",
    "manage_settings",
    "access_admin_panel",
  ],
  teacher: [
    "create_exams",
    "manage_own_exams",
    "invite_students",
    "grade_exams",
    "view_student_analytics",
  ],
  student: ["take_exams", "view_results", "view_leaderboard", "update_profile"],
} as const;

// Validation rules
export const VALIDATION_RULES = {
  EMAIL: {
    REQUIRED: true,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 255,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: false,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s'-]+$/,
  },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  REMEMBER_ME: "exam_platform_remember_me",
  LAST_LOGIN_EMAIL: "exam_platform_last_email",
  THEME_PREFERENCE: "exam_platform_theme",
  LANGUAGE_PREFERENCE: "exam_platform_language",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    REFRESH: "/api/auth/refresh",
    PROFILE: "/api/auth/profile",
  },
  USERS: {
    CREATE: "/api/users",
    LIST: "/api/users",
    UPDATE: "/api/users",
    DELETE: "/api/users",
  },
} as const;
