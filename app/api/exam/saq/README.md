# SAQ Exam API

This API provides endpoints for handling Short Answer Question (SAQ) exams, including answer submission, auto-save functionality, and grading.

## Endpoints

### Submit SAQ Answer

`POST /api/exam/saq`

Submit a final answer for an SAQ question during an exam.

**Request Body:**
```json
{
  "session_id": "string",
  "question_id": "string",
  "answer_text": "string"
}
```

**Response:**
```json
{
  "data": {
    "id": "string",
    "exam_id": "string",
    "user_id": "string",
    "question_text": "string",
    "answer_text": "string",
    "marks": number,
    "marks_obtained": number,
    "grader_comments": "string",
    "created_at": "string"
  },
  "message": "SAQ answer submitted successfully"
}
```

### Auto-Save SAQ Answer

`POST /api/exam/saq/autosave`

Auto-save a draft answer for an SAQ question during an exam.

**Request Body:**
```json
{
  "session_id": "string",
  "question_id": "string",
  "answer_text": "string"
}
```

**Response:**
```json
{
  "data": {
    "id": "string",
    "exam_id": "string",
    "user_id": "string",
    "question_text": "string",
    "answer_text": "string",
    "marks": number,
    "marks_obtained": number,
    "grader_comments": "string",
    "created_at": "string"
  },
  "message": "SAQ answer auto-saved successfully"
}
```

### Get Answer Versions

`GET /api/exam/saq/versions?session_id=:session_id&question_id=:question_id`

Get revision history for an SAQ answer.

**Query Parameters:**
- `session_id` (string): The exam session ID
- `question_id` (string): The SAQ question ID

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "session_id": "string",
      "question_id": "string",
      "answer_text": "string",
      "created_at": "string"
    }
  ]
}
```

### Review SAQ Answer

`PUT /api/exam/saq/review`

Review and grade a student's SAQ answer (teacher only).

**Request Body:**
```json
{
  "session_id": "string",
  "question_id": "string",
  "answer_text": "string (optional)",
  "marks_obtained": number (optional),
  "grader_comments": "string (optional)"
}
```

**Response:**
```json
{
  "data": {
    "id": "string",
    "exam_id": "string",
    "user_id": "string",
    "question_text": "string",
    "answer_text": "string",
    "marks": number,
    "marks_obtained": number,
    "grader_comments": "string",
    "created_at": "string"
  },
  "message": "SAQ answer reviewed successfully"
}
```