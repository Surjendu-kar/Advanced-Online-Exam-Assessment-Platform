"use client";

interface ExamModalHeaderProps {
  step: number;
  onGoBack: () => void;
  onClose: () => void;
}

export default function ExamModalHeader({
  step,
  onGoBack,
  onClose,
}: ExamModalHeaderProps) {
  return (
    <div className="px-4 py-2  border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {step === 1 ? (
            "Create New Exam"
          ) : (
            <button
              onClick={onGoBack}
              className="flex items-center text-gray-900 hover:text-blue-600 hover:bg-gray-100 px-3 py-2 rounded-full transition-all duration-200"
            >
              ←
            </button>
          )}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-red-500 hover:bg-gray-100 px-3 py-2 rounded-full transition-all duration-200"
          title="Create New Exam"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
