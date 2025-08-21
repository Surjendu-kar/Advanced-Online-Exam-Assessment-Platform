// app/api/teachers/route.ts
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { createServerClient } from "@/lib/supabaseServerClient";
import { createTeacherInvitation } from "@/lib/admin";

export async function POST(req: Request) {
  const routeClient = createRouteClient(req);
  const serverClient = createServerClient();

  try {
    const { email, firstName, lastName, institution } = await req.json();

    // Validate input
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Get current logged-in user
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Create teacher invitation using server client (admin privileges needed)
    const result = await createTeacherInvitation(serverClient, {
      email,
      firstName,
      lastName,
      institution,
      createdBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: `Teacher invitation sent successfully to ${email}`,
      invitation: {
        id: result.invitation?.id,
        email: result.invitation?.email,
        expires_at: result.invitation?.expires_at,
        created_at: result.invitation?.created_at,
      },
    });
  } catch (error) {
    console.error("Error in teachers API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET method to fetch teacher invitations for admin
export async function GET(req: Request) {
  const routeClient = createRouteClient(req);

  try {
    // Get current logged-in user
    const {
      data: { user },
    } = await routeClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get teacher invitations
    const { data: invitations, error: invitationsError } = await routeClient
      .from("teacher_invitations")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (invitationsError) {
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    // Get existing teachers created by this admin
    const { data: teachers, error: teachersError } = await routeClient
      .from("user_profiles")
      .select("*")
      .eq("role", "teacher")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (teachersError) {
      return NextResponse.json(
        { error: "Failed to fetch teachers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitations: invitations || [],
      teachers: teachers || [],
    });
  } catch (error) {
    console.error("Error fetching teachers data:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
