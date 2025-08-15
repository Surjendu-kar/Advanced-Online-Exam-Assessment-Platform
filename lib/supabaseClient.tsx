import { createClient, SupabaseClient } from "@supabase/supabase-js";
// Note: Using any for now, will be replaced with generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any;

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
export const supabase: SupabaseClient<Database> = createClient(
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public details?: any
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}

// Utility function to handle Supabase responses
export function handleSupabaseResponse<T>(response: {
  data: T | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}): T {
  if (response.error) {
    throw new SupabaseError(
      response.error.message || "An unknown error occurred",
      response.error.code,
      response.error.details
    );
  }

  if (response.data === null) {
    throw new SupabaseError("No data returned from query");
  }

  return response.data;
}

// Connection test utility
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
}
