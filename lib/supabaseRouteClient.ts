// lib/supabaseRouteClient.ts
import { createClient } from "@supabase/supabase-js";

export function createRouteClient(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
    },
  });
}
