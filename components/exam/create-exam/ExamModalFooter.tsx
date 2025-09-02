"use client";

import { Button } from "@/components/ui/Button";

interface ExamModalFooterProps {
  step: number;
  examTitle: string;
  questionsCount: number;
  submitting: boolean;
  isEditMode?: boolean;
  onNextStep: () => void;
  onCreateExam: () => void;
  onCancel: () => void;
}

export default function ExamModalFooter({
  step,
  examTitle,
  questionsCount,
  submitting,
  isEditMode = false,
  onNextStep,
  onCreateExam,
  onCancel,
}: ExamModalFooterProps) {
  return (
    <div className="px-6 py-4 ">
      {step === 1 && (
        <div className="flex justify-end">
          <Button onClick={onNextStep} disabled={!examTitle.trim()}>
            Next: Add Questions
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onCreateExam}
            loading={submitting}
            disabled={submitting || questionsCount === 0}
          >
            {submitting
              ? isEditMode
                ? "Updating Exam..."
                : "Creating Exam..."
              : isEditMode
              ? "Update Exam"
              : "Create Exam"}
          </Button>
        </div>
      )}
    </div>
  );
}
