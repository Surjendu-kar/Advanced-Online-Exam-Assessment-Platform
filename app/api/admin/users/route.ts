import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/types/database";
import { AdminService } from "@/lib/services/adminService";
import { verifyAdminAuth } from "@/lib/middleware/adminAuth";

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") as UserProfile["role"] | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const users = await AdminService.getUsers({
      role: role || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      data: users.data,
      count: users.count,
      page,
      limit,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { email, password, role, first_name, last_name, institution } = body;

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["teacher", "student"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be either 'teacher' or 'student'" },
        { status: 400 }
      );
    }

    // Create user account
    const newUser = await AdminService.createUser({
      email: email.trim().toLowerCase(),
      password,
      role,
      first_name,
      last_name,
      institution,
      created_by: authResult.user.id,
    });

    return NextResponse.json({
      data: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Admin users POST error:", error);

    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
