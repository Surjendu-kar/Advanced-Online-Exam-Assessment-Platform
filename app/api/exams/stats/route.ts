import { NextRequest, NextResponse } from "next/server";
import { ExamService } from "@/lib/services/examService";
import { verifyTeacherAuth } from "@/lib/middleware/teacherAuth";

export async function GET(request: NextRequest) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const stats = await ExamService.getExamStats(authResult.user.id);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Exam stats GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam statistics" },
      { status: 500 }
    );
  }
}
