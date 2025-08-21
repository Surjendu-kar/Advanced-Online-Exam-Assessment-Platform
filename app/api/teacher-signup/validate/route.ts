// app/api/teacher-signup/validate/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import { validateInvitationToken } from "@/lib/admin";

export async function POST(req: Request) {
  const serverClient = createServerClient();

  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Validate invitation token
    const result = await validateInvitationToken(serverClient, token);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      invitation: result.invitation,
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}