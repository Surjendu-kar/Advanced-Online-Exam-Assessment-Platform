import { NextRequest, NextResponse } from "next/server";
import { ExamService } from "@/lib/services/examService";
import { verifyTeacherAuth } from "@/lib/middleware/teacherAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const archivedExam = await ExamService.archiveExam(
      authResult.user.id,
      params.examId
    );

    return NextResponse.json({
      data: archivedExam,
      message: "Exam archived successfully",
    });
  } catch (error) {
    console.error("Exam archive error:", error);

    if (error instanceof Error) {
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to archive exam" },
      { status: 500 }
    );
  }
}
