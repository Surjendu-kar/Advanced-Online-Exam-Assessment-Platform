import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/adminService";
import { verifyAdminAuth } from "@/lib/middleware/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const user = await AdminService.getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Admin user GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { first_name, last_name, institution, verified } = body;

    const updatedUser = await AdminService.updateUser(userId, {
      first_name,
      last_name,
      institution,
      verified,
    });

    return NextResponse.json({
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Admin user PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    // Prevent admin from deleting themselves
    if (userId === authResult.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await AdminService.deactivateUser(userId);

    return NextResponse.json({
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Admin user DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}
