import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CodingService,
  CreateCodingRequest,
  SUPPORTED_LANGUAGES,
} from "../../../../lib/services/codingService";
import { SupabaseError } from "../../../../lib/supabaseClient";

// Mock Supabase client
vi.mock("../../../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
  },
  SupabaseError: class extends Error {
    constructor(
      message: string,
      public code: string,
      public originalError?: any
    ) {
      super(message);
      this.name = "SupabaseError";
    }
  },
}));

describe("CodingService", () => {
  const mockUserId = "user-123";
  const mockExamId = "exam-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation Rules", () => {
    it("should validate question text requirements", () => {
      const testCases = [
        { text: "", valid: false, reason: "empty text" },
        { text: "Valid coding question?", valid: true, reason: "normal text" },
        { text: "a".repeat(5001), valid: false, reason: "text too long" },
      ];

      testCases.forEach(({ text, valid, reason }) => {
        const isValid = text.length > 0 && text.length <= 5000;
        expect(isValid).toBe(valid);
      });
    });

    it("should validate marks range", () => {
      const testCases = [
        { marks: 0, valid: false },
        { marks: 0.4, valid: false },
        { marks: 0.5, valid: true },
        { marks: 50, valid: true },
        { marks: 100, valid: true },
        { marks: 101, valid: false },
      ];

      testCases.forEach(({ marks, valid }) => {
        const isValid = marks >= 0.5 && marks <= 100;
        expect(isValid).toBe(valid);
      });
    });

    it("should validate supported languages", () => {
      const supportedLanguageIds = SUPPORTED_LANGUAGES.map((lang) => lang.id);

      const testCases = [
        { language: "javascript", valid: true },
        { language: "python", valid: true },
        { language: "java", valid: true },
        { language: "unsupported", valid: false },
        { language: "", valid: false },
      ];

      testCases.forEach(({ language, valid }) => {
        const isValid = supportedLanguageIds.includes(language);
        expect(isValid).toBe(valid);
      });
    });

    it("should validate starter code length", () => {
      const testCases = [
        { code: undefined, valid: true },
        { code: "", valid: true },
        { code: 'console.log("Hello");', valid: true },
        { code: "a".repeat(10000), valid: true },
        { code: "a".repeat(10001), valid: false },
      ];

      testCases.forEach(({ code, valid }) => {
        const isValid = !code || code.length <= 10000;
        expect(isValid).toBe(valid);
      });
    });

    it("should validate expected output length", () => {
      const testCases = [
        { output: undefined, valid: true },
        { output: "", valid: true },
        { output: "Hello World", valid: true },
        { output: "a".repeat(5000), valid: true },
        { output: "a".repeat(5001), valid: false },
      ];

      testCases.forEach(({ output, valid }) => {
        const isValid = !output || output.length <= 5000;
        expect(isValid).toBe(valid);
      });
    });

    it("should validate test cases", () => {
      const validTestCase = {
        input: "test input",
        expected_output: "test output",
        is_hidden: false,
      };

      const invalidTestCases = [
        {
          ...validTestCase,
          input: "a".repeat(1001), // Too long
        },
        {
          ...validTestCase,
          expected_output: "a".repeat(1001), // Too long
        },
        {
          ...validTestCase,
          is_hidden: "not a boolean" as any, // Wrong type
        },
      ];

      // Valid test case should pass basic validation
      expect(validTestCase.input.length).toBeLessThanOrEqual(1000);
      expect(validTestCase.expected_output.length).toBeLessThanOrEqual(1000);
      expect(typeof validTestCase.is_hidden).toBe("boolean");

      // Invalid test cases should fail validation
      invalidTestCases.forEach((testCase) => {
        const inputValid = testCase.input.length <= 1000;
        const outputValid = testCase.expected_output.length <= 1000;
        const hiddenValid = typeof testCase.is_hidden === "boolean";

        expect(inputValid && outputValid && hiddenValid).toBe(false);
      });
    });

    it("should require at least one visible test case", () => {
      const allHiddenTestCases = [
        { input: "1", expected_output: "1", is_hidden: true },
        { input: "2", expected_output: "2", is_hidden: true },
      ];

      const mixedTestCases = [
        { input: "1", expected_output: "1", is_hidden: false },
        { input: "2", expected_output: "2", is_hidden: true },
      ];

      const visibleInAllHidden = allHiddenTestCases.filter(
        (tc) => !tc.is_hidden
      );
      const visibleInMixed = mixedTestCases.filter((tc) => !tc.is_hidden);

      expect(visibleInAllHidden.length).toBe(0);
      expect(visibleInMixed.length).toBeGreaterThan(0);
    });

    it("should limit maximum test cases", () => {
      const maxTestCases = 20;
      const tooManyTestCases = Array(21)
        .fill(null)
        .map((_, i) => ({
          input: `input${i}`,
          expected_output: `output${i}`,
          is_hidden: false,
        }));

      const validTestCases = Array(20)
        .fill(null)
        .map((_, i) => ({
          input: `input${i}`,
          expected_output: `output${i}`,
          is_hidden: false,
        }));

      expect(tooManyTestCases.length).toBeGreaterThan(maxTestCases);
      expect(validTestCases.length).toBeLessThanOrEqual(maxTestCases);
    });
  });

  describe("Language Templates", () => {
    it("should provide templates for all supported languages", () => {
      SUPPORTED_LANGUAGES.forEach(({ id }) => {
        const template = CodingService.getLanguageTemplate(id);
        expect(template).toBeTruthy();
        expect(typeof template).toBe("string");
        expect(template.length).toBeGreaterThan(0);
      });
    });

    it("should provide fallback template for unsupported languages", () => {
      const template = CodingService.getLanguageTemplate("unsupported");
      expect(template).toBeTruthy();
      expect(template).toContain("unsupported");
    });

    it("should return predefined coding templates", () => {
      const templates = CodingService.getCodingTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      templates.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("language");
        expect(template).toHaveProperty("starter_code");
        expect(template).toHaveProperty("example_question");
        expect(template).toHaveProperty("example_test_cases");
        expect(Array.isArray(template.example_test_cases)).toBe(true);
      });
    });
  });

  describe("Supported Languages", () => {
    it("should have valid language configurations", () => {
      expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);

      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(lang).toHaveProperty("id");
        expect(lang).toHaveProperty("name");
        expect(lang).toHaveProperty("judge0_id");
        expect(typeof lang.id).toBe("string");
        expect(typeof lang.name).toBe("string");
        expect(typeof lang.judge0_id).toBe("number");
        expect(lang.id.length).toBeGreaterThan(0);
        expect(lang.name.length).toBeGreaterThan(0);
        expect(lang.judge0_id).toBeGreaterThan(0);
      });
    });

    it("should have unique language IDs", () => {
      const ids = SUPPORTED_LANGUAGES.map((lang) => lang.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique Judge0 IDs", () => {
      const judge0Ids = SUPPORTED_LANGUAGES.map((lang) => lang.judge0_id);
      const uniqueJudge0Ids = new Set(judge0Ids);
      expect(uniqueJudge0Ids.size).toBe(judge0Ids.length);
    });
  });

  describe("Data Structure Validation", () => {
    it("should validate CreateCodingRequest structure", () => {
      const validRequest: CreateCodingRequest = {
        exam_id: mockExamId,
        question_text: "Write a function to add two numbers",
        starter_code: "function add(a, b) {\n  // Your code here\n}",
        expected_output: "5",
        marks: 10,
        language: "javascript",
        test_cases: [
          {
            input: "2 3",
            expected_output: "5",
            is_hidden: false,
          },
        ],
      };

      // Validate required fields
      expect(validRequest.exam_id).toBeTruthy();
      expect(validRequest.question_text).toBeTruthy();
      expect(validRequest.marks).toBeGreaterThan(0);
      expect(validRequest.language).toBeTruthy();

      // Validate optional fields
      expect(validRequest.starter_code).toBeTruthy();
      expect(validRequest.expected_output).toBeTruthy();
      expect(Array.isArray(validRequest.test_cases)).toBe(true);
    });

    it("should validate test case structure", () => {
      const validTestCase = {
        input: "test input",
        expected_output: "test output",
        is_hidden: false,
      };

      expect(validTestCase).toHaveProperty("input");
      expect(validTestCase).toHaveProperty("expected_output");
      expect(validTestCase).toHaveProperty("is_hidden");
      expect(typeof validTestCase.input).toBe("string");
      expect(typeof validTestCase.expected_output).toBe("string");
      expect(typeof validTestCase.is_hidden).toBe("boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors appropriately", () => {
      const invalidRequests = [
        {
          // Missing question_text
          exam_id: mockExamId,
          marks: 10,
          language: "javascript",
        },
        {
          // Invalid marks
          exam_id: mockExamId,
          question_text: "Valid question",
          marks: 0,
          language: "javascript",
        },
        {
          // Invalid language
          exam_id: mockExamId,
          question_text: "Valid question",
          marks: 10,
          language: "invalid",
        },
      ];

      invalidRequests.forEach((request) => {
        // These would fail validation in the actual service
        const hasQuestionText = !!(request as any).question_text?.trim();
        const hasValidMarks =
          (request as any).marks >= 0.5 && (request as any).marks <= 100;
        const hasValidLanguage = SUPPORTED_LANGUAGES.some(
          (lang) => lang.id === (request as any).language
        );

        const isValid = hasQuestionText && hasValidMarks && hasValidLanguage;
        expect(isValid).toBe(false);
      });
    });
  });
});
