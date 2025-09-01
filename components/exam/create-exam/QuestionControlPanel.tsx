import { Button } from "@/components/ui/Button";

interface QuestionControlPanelProps {
  currentQuestionType: "mcq" | "saq" | "coding";
  showQuestionForm: boolean;
  totalMarks: number;
  startTime: string;
  endTime: string;
  onQuestionTypeChange: (type: "mcq" | "saq" | "coding") => void;
  onToggleQuestionForm: () => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export default function QuestionControlPanel({
  currentQuestionType,
  showQuestionForm,
  totalMarks,
  startTime,
  endTime,
  onQuestionTypeChange,
  onToggleQuestionForm,
  onStartTimeChange,
  onEndTimeChange,
}: QuestionControlPanelProps) {
  // Get current date and time in the format required by datetime-local
  const getCurrentDateTime = () => {
    const now = new Date();
    // Subtract timezone offset to get local time
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return localDateTime.toISOString().slice(0, 16);
  };

  const minDateTime = getCurrentDateTime();
  return (
    <div className="space-y-4 sticky top-0 self-start h-fit max-h-[calc(85vh-200px)] px-1 overflow-y-auto min-w-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type
        </label>
        <select
          value={currentQuestionType}
          onChange={(e) =>
            onQuestionTypeChange(e.target.value as "mcq" | "saq" | "coding")
          }
          className="w-full border border-gray-300 p-3 rounded-md text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        >
          <option value="mcq">Multiple Choice (MCQ)</option>
          <option value="saq">Short Answer (SAQ)</option>
          <option value="coding">Coding Challenge</option>
        </select>
      </div>

      <Button onClick={onToggleQuestionForm} className="w-full">
        {showQuestionForm
          ? "Cancel"
          : `Add ${currentQuestionType.toUpperCase()} Question`}
      </Button>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Start Time
        </label>
        <input
          type="datetime-local"
          value={startTime}
          min={minDateTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-md text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          End Time
        </label>
        <input
          type="datetime-local"
          value={endTime}
          min={startTime || minDateTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-md text-black bg-white focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
        />
      </div>

      <div className="">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Total Marks
        </label>
        <input
          type="number"
          value={totalMarks}
          disabled
          className="w-full border border-gray-300 p-3 rounded-md text-black bg-gray-50 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
