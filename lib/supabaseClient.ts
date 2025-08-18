import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `Invalid Supabase URL format: ${supabaseUrl}. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.`
  );
}

// Create Supabase client with enhanced configuration
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        "X-Client-Info": "online-exam-platform",
      },
    },
    db: {
      schema: "public",
    },
  }
);

// Error handling utility for Supabase operations
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}

// Utility function to handle Supabase responses
export function handleSupabaseResponse<T>(response: {
  data: T | null;
  error: unknown;
}): T {
  if (response.error) {
    const error = response.error as { 
      message?: string; 
      code?: string; 
      details?: unknown 
    };
    
    throw new SupabaseError(
      error.message || "An unknown error occurred",
      error.code,
      error.details
    );
  }

  if (response.data === null) {
    throw new SupabaseError("No data returned from query");
  }

  return response.data;
}