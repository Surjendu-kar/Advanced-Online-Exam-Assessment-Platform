// Empty Supabase types file - to be generated from Supabase dashboard
// Run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts`
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Add your table definitions here or generate from Supabase
    }
    Views: {
      // Add your view definitions here
    }
    Functions: {
      // Add your function definitions here
    }
  }
}