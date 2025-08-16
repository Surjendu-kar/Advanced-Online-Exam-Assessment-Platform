# SAQ Question Management System

This module implements a comprehensive Short Answer Question (SAQ) management system for the Advanced Online Exam Platform.

## Features Implemented

### ✅ Core SAQ Management

- **Create SAQ questions** with validation
- **Read/List SAQ questions** with pagination and filtering
- **Update SAQ questions** with ownership verification
- **Delete SAQ questions** with published exam protection

### ✅ Enhanced SAQ Features

- **Answer Guidelines**: Optional guidance for students on how to approach the question
- **Marking Criteria**: Detailed criteria for teachers to grade consistently
- **Grader Comments**: Space for teacher feedback on student answers
- **Flexible Marks**: Support for decimal marks (0.5 to 100)

### ✅ Question Templates

- **6 Predefined Templates** for common question types:
  - Explain a Concept (Conceptual)
  - Compare and Contrast (Analytical)
  - Problem Solving (Problem-solving)
  - Case Analysis (Analytical)
  - Evaluate Argument (Critical-thinking)
  - Describe Process (Descriptive)
- **Template Customization**: Modify templates when creating questions
- **Category-based Organization**: Templates organized by learning objectives

### ✅ Bulk Operations

- **Bulk Delete**: Remove multiple questions at once
- **Bulk Update Marks**: Update marks for multiple questions
- **Bulk Reorder**: Change question order (placeholder for future implementation)

### ✅ Import/Export System

- **Import Questions**: Bulk import from JSON data (up to 100 questions)
- **Export Questions**: Export questions for backup or sharing
- **Validation**: Comprehensive validation during import

### ✅ Question Bank & Reuse

- **Question Bank**: Browse previously created questions
- **Copy Questions**: Copy questions between exams
- **Search & Filter**: Find questions by text content

### ✅ Analytics & Statistics

- **Question Statistics**: Count, total marks, average marks
- **Feature Usage**: Track questions with guidelines/criteria
- **Performance Metrics**: Analyze question effectiveness

## API Endpoints

### Core CRUD Operations

- `GET /api/saq` - List SAQ questions with pagination
- `POST /api/saq` - Create new SAQ question
- `GET /api/saq/[id]` - Get specific SAQ question
- `PUT /api/saq/[id]` - Update SAQ question
- `DELETE /api/saq/[id]` - Delete SAQ question

### Advanced Features

- `POST /api/saq/bulk` - Bulk operations (delete, update marks, reorder)
- `POST /api/saq/import` - Import questions from data array
- `GET /api/saq/export` - Export questions for an exam
- `GET /api/saq/question-bank` - Browse question bank
- `POST /api/saq/copy` - Copy question to another exam
- `GET /api/saq/stats` - Get question statistics
- `GET /api/saq/templates` - Get available templates
- `POST /api/saq/templates` - Create question from template

### Exam Taking Features

- `POST /api/exam/saq` - Submit final SAQ answer during exam
- `POST /api/exam/saq/autosave` - Auto-save draft SAQ answer during exam
- `GET /api/exam/saq/versions` - Get revision history for SAQ answers
- `PUT /api/exam/saq/review` - Review and grade student SAQ answers

See [SAQ Exam API Documentation](./exam/saq/README.md) for detailed exam-taking endpoint documentation.

## Database Schema Updates

The SAQ table has been enhanced with new fields:

```sql
create table public.saq (
  id uuid not null default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid references auth.users(id),
  question_text text not null,
  correct_answer text,
  answer_text text,
  answer_guidelines text,        -- NEW: Guidance for students
  marking_criteria text,         -- NEW: Grading criteria
  marks int,
  marks_obtained int,
  grader_comments text,          -- NEW: Teacher feedback
  created_at timestamptz not null default now(),
  constraint saq_pkey primary key (id)
);
```

## Validation Rules

### Question Text

- Required field
- Maximum 5,000 characters
- Must be non-empty after trimming

### Marks

- Required field
- Range: 0.5 to 100
- Supports decimal values

### Optional Fields

- **Correct Answer**: Maximum 2,000 characters
- **Answer Guidelines**: Maximum 1,000 characters
- **Marking Criteria**: Maximum 1,000 characters
- **Grader Comments**: Maximum 1,000 characters

### Security

- **Ownership Verification**: Users can only manage questions in their own exams
- **Published Exam Protection**: Cannot modify questions in published exams
- **Row Level Security**: Database-level access control

## Testing

### Unit Tests (16 tests)

- ✅ SAQ creation and validation
- ✅ Field length validation
- ✅ Template system functionality
- ✅ Error handling

### Integration Tests (9 tests)

- ✅ Template structure validation
- ✅ API endpoint structure
- ✅ Data consistency checks
- ✅ Request/response formats

## Usage Examples

### Creating a Basic SAQ

```typescript
const saq = await SAQService.createSAQ(userId, {
  exam_id: "exam-123",
  question_text: "Explain the process of photosynthesis.",
  correct_answer: "Photosynthesis converts light energy to chemical energy...",
  answer_guidelines:
    "Include the role of chlorophyll and the chemical equation.",
  marking_criteria: "Full marks: Process + equation + chlorophyll role",
  marks: 8,
});
```

### Creating from Template

```typescript
const saq = await SAQService.createFromTemplate(
  userId,
  examId,
  "explain-concept",
  {
    question_text: "Explain the concept of machine learning.",
    marks: 10,
  }
);
```

### Importing Multiple Questions

```typescript
const questions = [
  {
    question_text: "Define artificial intelligence.",
    marks: 5,
    answer_guidelines: "Include key characteristics and applications.",
  },
  // ... more questions
];

const imported = await SAQService.importSAQs(userId, examId, questions);
```

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 2.5**: SAQ question creation with answer guidelines and marking criteria
- **Requirement 5.1**: SAQ assessment interface support
- **Requirement 5.5**: Manual grading system support with marking criteria

## Future Enhancements

- **Question Ordering**: Implement database field for question sequence
- **Rich Text Support**: HTML formatting for questions and answers
- **Question Difficulty**: Add difficulty levels and tagging
- **Collaborative Grading**: Multiple graders for the same question
- **Auto-suggestions**: AI-powered question generation from templates