import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { getExamResponseStats } from "@/lib/studentResponses";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const routeClient = createRouteClient(req);
  const { id: examId } = await params;

  try {
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a teacher
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden - Teacher access required" },
        { status: 403 }
      );
    }

    const stats = await getExamResponseStats(examId, "route", req);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in grading stats GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
