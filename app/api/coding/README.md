# Coding Questions API

This API provides comprehensive management for coding questions in the online exam platform. It supports multiple programming languages, test case management, and various operations for creating and managing coding challenges.

## Features

- **Multi-language Support**: JavaScript, Python, Java, C++, C, C#, Go, Rust, TypeScript
- **Test Case Management**: Support for visible and hidden test cases
- **Code Templates**: Predefined templates for different programming languages
- **Bulk Operations**: Delete, reorder, update marks, and change languages in bulk
- **Question Bank**: Reusable coding questions across exams
- **Import/Export**: JSON-based import and export functionality
- **Statistics**: Comprehensive analytics for coding questions

## Endpoints

### Core Operations

#### `GET /api/coding`

Get paginated list of coding questions.

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `search` (string, optional): Search in question text
- `exam_id` (string, optional): Filter by specific exam
- `language` (string, optional): Filter by programming language

**Response:**

```json
{
  "data": [
    {
      "id": "coding-123",
      "exam_id": "exam-456",
      "question_text": "Write a function to add two numbers",
      "starter_code": "function add(a, b) {\n  // Your code here\n}",
      "expected_output": "5",
      "marks": 10,
      "language": "javascript",
      "test_cases": [
        {
          "input": "2 3",
          "expected_output": "5",
          "is_hidden": false
        }
      ],
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "page": 1,
  "limit": 10
}
```

#### `POST /api/coding`

Create a new coding question.

**Request Body:**

```json
{
  "exam_id": "exam-456",
  "question_text": "Write a function to add two numbers",
  "starter_code": "function add(a, b) {\n  // Your code here\n}",
  "expected_output": "5",
  "marks": 10,
  "language": "javascript",
  "test_cases": [
    {
      "input": "2 3",
      "expected_output": "5",
      "is_hidden": false
    },
    {
      "input": "10 -5",
      "expected_output": "5",
      "is_hidden": true
    }
  ]
}
```

#### `GET /api/coding/[id]`

Get coding question by ID.

#### `PUT /api/coding/[id]`

Update coding question.

#### `DELETE /api/coding/[id]`

Delete coding question.

### Bulk Operations

#### `POST /api/coding/bulk`

Perform bulk operations on multiple coding questions.

**Request Body:**

```json
{
  "action": "delete|reorder|update_marks|update_language",
  "question_ids": ["coding-123", "coding-456"],
  "data": {
    "marks": 15,
    "language": "python",
    "order": [1, 2]
  }
}
```

### Question Management

#### `POST /api/coding/copy`

Copy coding question to another exam.

**Request Body:**

```json
{
  "coding_id": "coding-123",
  "target_exam_id": "exam-789"
}
```

#### `POST /api/coding/import`

Import coding questions from JSON data.

**Request Body:**

```json
{
  "exam_id": "exam-456",
  "coding_data": [
    {
      "question_text": "Write a function to reverse a string",
      "starter_code": "def reverse_string(s):\n    # Your code here\n    pass",
      "expected_output": "olleh",
      "marks": 5,
      "language": "python",
      "test_cases": [
        {
          "input": "hello",
          "expected_output": "olleh",
          "is_hidden": false
        }
      ]
    }
  ]
}
```

#### `GET /api/coding/export`

Export coding questions for an exam.

**Query Parameters:**

- `exam_id` (string, required): Exam ID to export questions from

### Utilities

#### `GET /api/coding/question-bank`

Get coding questions for reuse across exams.

**Query Parameters:**

- `search` (string, optional): Search in question text
- `language` (string, optional): Filter by programming language
- `limit` (number, optional): Maximum questions to return (default: 50)

#### `GET /api/coding/stats`

Get coding statistics for an exam.

**Query Parameters:**

- `exam_id` (string, required): Exam ID to get statistics for

**Response:**

```json
{
  "data": {
    "total": 5,
    "totalMarks": 50,
    "averageMarks": 10,
    "languageDistribution": {
      "javascript": 3,
      "python": 2
    },
    "testCaseStats": {
      "totalTestCases": 10,
      "averageTestCasesPerQuestion": 2,
      "visibleTestCases": 5,
      "hiddenTestCases": 5
    }
  }
}
```

#### `GET /api/coding/templates`

Get coding templates and supported languages.

**Query Parameters:**

- `language` (string, optional): Get template for specific language

**Response (all templates):**

```json
{
  "data": {
    "templates": [
      {
        "id": "hello-world-js",
        "name": "Hello World - JavaScript",
        "description": "Basic JavaScript function template",
        "language": "javascript",
        "starter_code": "function solution() {\n    return \"Hello, World!\";\n}",
        "example_question": "Write a function that returns 'Hello, World!'",
        "example_test_cases": [
          {
            "input": "",
            "expected_output": "Hello, World!",
            "is_hidden": false
          }
        ]
      }
    ],
    "supported_languages": [
      {
        "id": "javascript",
        "name": "JavaScript",
        "judge0_id": 63
      }
    ]
  }
}
```

## Supported Languages

| Language   | ID         | Judge0 ID |
| ---------- | ---------- | --------- |
| JavaScript | javascript | 63        |
| Python 3   | python     | 71        |
| Java       | java       | 62        |
| C++        | cpp        | 54        |
| C          | c          | 50        |
| C#         | csharp     | 51        |
| Go         | go         | 60        |
| Rust       | rust       | 73        |
| TypeScript | typescript | 74        |

## Validation Rules

### Question Text

- Required field
- Maximum 5000 characters

### Starter Code

- Optional field
- Maximum 10000 characters

### Expected Output

- Optional field
- Maximum 5000 characters

### Marks

- Required field
- Must be between 0.5 and 100

### Language

- Required field
- Must be one of the supported languages

### Test Cases

- Maximum 20 test cases per question
- Each test case input: maximum 1000 characters
- Each test case expected output: maximum 1000 characters
- At least one test case must be visible to students
- `is_hidden` must be a boolean value

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (e.g., trying to modify published exam)
- `500` - Internal Server Error

Error responses include descriptive messages:

```json
{
  "error": "Question text must be less than 5000 characters"
}
```

## Authentication

All endpoints require authentication. Include the user's session token in the request headers or cookies as configured by Supabase Auth.

## Rate Limiting

- Import operations are limited to 50 questions per request
- Question bank queries are limited to 50 results
- Bulk operations support up to 100 questions at once

## Best Practices

1. **Test Cases**: Always include both visible and hidden test cases for comprehensive evaluation
2. **Starter Code**: Provide meaningful starter code to guide students
3. **Language Selection**: Choose appropriate languages based on the problem complexity
4. **Validation**: Validate all inputs on the client side before API calls
5. **Error Handling**: Implement proper error handling for all API responses
6. **Bulk Operations**: Use bulk operations for efficiency when managing multiple questions

## Examples

### Creating a Simple Coding Question

```javascript
const response = await fetch("/api/coding", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    exam_id: "exam-123",
    question_text: "Write a function that returns the sum of two numbers.",
    starter_code: "function sum(a, b) {\n  // Your code here\n}",
    expected_output: "8",
    marks: 5,
    language: "javascript",
    test_cases: [
      {
        input: "3 5",
        expected_output: "8",
        is_hidden: false,
      },
      {
        input: "10 -2",
        expected_output: "8",
        is_hidden: true,
      },
    ],
  }),
});
```

### Bulk Updating Marks

```javascript
const response = await fetch("/api/coding/bulk", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "update_marks",
    question_ids: ["coding-1", "coding-2", "coding-3"],
    data: {
      marks: 15,
    },
  }),
});
```

### Getting Language Template

```javascript
const response = await fetch("/api/coding/templates?language=python");
const data = await response.json();
console.log(data.data.template);
// Output: Python starter code template
```
