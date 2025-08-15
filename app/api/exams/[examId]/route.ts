import { NextRequest, NextResponse } from "next/server";
import { ExamService } from "@/lib/services/examService";
import { verifyTeacherAuth } from "@/lib/middleware/teacherAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const exam = await ExamService.getExamById(
      authResult.user.id,
      params.examId
    );

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ data: exam });
  } catch (error) {
    console.error("Exam GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      start_time,
      end_time,
      duration,
      access_type,
      exam_code,
      max_attempts,
      shuffle_questions,
      show_results_immediately,
      require_webcam,
      max_violations,
      is_published,
    } = body;

    const updates: any = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (access_type !== undefined) updates.access_type = access_type;
    if (exam_code !== undefined) updates.exam_code = exam_code;
    if (max_attempts !== undefined)
      updates.max_attempts = parseInt(max_attempts);
    if (shuffle_questions !== undefined)
      updates.shuffle_questions = Boolean(shuffle_questions);
    if (show_results_immediately !== undefined)
      updates.show_results_immediately = Boolean(show_results_immediately);
    if (require_webcam !== undefined)
      updates.require_webcam = Boolean(require_webcam);
    if (max_violations !== undefined)
      updates.max_violations = parseInt(max_violations);
    if (is_published !== undefined)
      updates.is_published = Boolean(is_published);

    const updatedExam = await ExamService.updateExam(
      authResult.user.id,
      params.examId,
      updates
    );

    return NextResponse.json({
      data: updatedExam,
      message: "Exam updated successfully",
    });
  } catch (error) {
    console.error("Exam PUT error:", error);

    if (error instanceof Error) {
      if (error.message.includes("VALIDATION_ERROR")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
      if (error.message.includes("DUPLICATE_CODE_ERROR")) {
        return NextResponse.json(
          { error: "Exam code already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update exam" },
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
    await ExamService.deleteExam(authResult.user.id, params.examId);

    return NextResponse.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Exam DELETE error:", error);

    if (error instanceof Error) {
      if (error.message.includes("EXAM_NOT_FOUND")) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
      if (error.message.includes("ACTIVE_SESSIONS_ERROR")) {
        return NextResponse.json(
          { error: "Cannot delete exam with active sessions" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
  }
}
