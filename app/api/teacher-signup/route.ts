// app/api/teacher-signup/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import { completeTeacherRegistration } from "@/lib/admin";

export async function POST(req: Request) {
  const serverClient = createServerClient();

  try {
    const { token, password } = await req.json();

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain uppercase, lowercase, and number" },
        { status: 400 }
      );
    }

    // Complete teacher registration
    const result = await completeTeacherRegistration(
      serverClient,
      token,
      password
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: "Teacher account created successfully",
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    });
  } catch (error) {
    console.error("Error in teacher signup:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}