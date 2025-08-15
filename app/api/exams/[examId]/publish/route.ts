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
    const publishedExam = await ExamService.publishExam(
      authResult.user.id,
      params.examId
    );

    return NextResponse.json({
      data: publishedExam,
      message: "Exam published successfully",
    });
  } catch (error) {
    console.error("Exam publish error:", error);

    if (error instanceof Error) {
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
      if (error.message.includes("NO_QUESTIONS_ERROR")) {
        return NextResponse.json(
          { error: "Cannot publish exam without questions" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to publish exam" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const unpublishedExam = await ExamService.unpublishExam(
      authResult.user.id,
      params.examId
    );

    return NextResponse.json({
      data: unpublishedExam,
      message: "Exam unpublished successfully",
    });
  } catch (error) {
    console.error("Exam unpublish error:", error);

    if (error instanceof Error) {
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to unpublish exam" },
      { status: 500 }
    );
  }
}
