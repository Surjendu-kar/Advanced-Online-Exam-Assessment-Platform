import { NextRequest, NextResponse } from "next/server";
import { ExamService } from "@/lib/services/examService";
import { verifyTeacherAuth } from "@/lib/middleware/teacherAuth";

export async function GET(request: NextRequest) {
  const authResult = await verifyTeacherAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const is_published = searchParams.get("is_published");
    const access_type = searchParams.get("access_type") as
      | "invitation"
      | "code"
      | "open"
      | undefined;

    const exams = await ExamService.getExams(authResult.user.id, {
      page,
      limit,
      search,
      is_published: is_published ? is_published === "true" : undefined,
      access_type,
    });

    return NextResponse.json({
      data: exams.data,
      count: exams.count,
      page,
      limit,
    });
  } catch (error) {
    console.error("Exams GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    } = body;

    // Validate required fields
    if (!title || !start_time || !end_time || !duration || !access_type) {
      return NextResponse.json(
        {
          error:
            "Title, start time, end time, duration, and access type are required",
        },
        { status: 400 }
      );
    }

    // Create exam
    const newExam = await ExamService.createExam(authResult.user.id, {
      title: title.trim(),
      description: description?.trim(),
      start_time,
      end_time,
      duration: parseInt(duration),
      access_type,
      exam_code,
      max_attempts: max_attempts ? parseInt(max_attempts) : undefined,
      shuffle_questions: Boolean(shuffle_questions),
      show_results_immediately: Boolean(show_results_immediately),
      require_webcam: require_webcam !== false,
      max_violations: max_violations ? parseInt(max_violations) : undefined,
    });

    return NextResponse.json({
      data: newExam,
      message: "Exam created successfully",
    });
  } catch (error) {
    console.error("Exams POST error:", error);

    if (error instanceof Error) {
      if (error.message.includes("VALIDATION_ERROR")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("DUPLICATE_CODE_ERROR")) {
        return NextResponse.json(
          { error: "Exam code already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}
