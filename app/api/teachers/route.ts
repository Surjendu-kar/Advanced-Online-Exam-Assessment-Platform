// app/api/teachers/route.ts
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { createServerClient } from "@/lib/supabaseServerClient";
import { createTeacherAccount } from "@/lib/admin";

export async function POST(req: Request) {
  const routeClient = createRouteClient(req); // ✅ pass Request
  const serverClient = createServerClient();

  const { email, firstName, lastName, institution } = await req.json();

  // ✅ 1. Get current logged-in user
  const {
    data: { user },
    error,
  } = await routeClient.auth.getUser();

  console.log("Auth user:", user);
  console.log("Auth error:", error);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ 2. Check role
  const { data: profile } = await routeClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ 3. Create teacher with server client
  const result = await createTeacherAccount(serverClient, {
    email,
    firstName,
    lastName,
    institution,
    createdBy: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}
