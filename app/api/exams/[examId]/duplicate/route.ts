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
    const body = await request.json();
    const { title, description, start_time, end_time } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Title is required for duplicated exam" },
        { status: 400 }
      );
    }

    const duplicatedExam = await ExamService.duplicateExam(
      authResult.user.id,
      params.examId,
      {
        title: title.trim(),
        description: description?.trim(),
        start_time,
        end_time,
      }
    );

    return NextResponse.json({
      data: duplicatedExam,
      message: "Exam duplicated successfully",
    });
  } catch (error) {
    console.error("Exam duplicate error:", error);

    if (error instanceof Error) {
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Original exam not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("VALIDATION_ERROR")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to duplicate exam" },
      { status: 500 }
    );
  }
}
