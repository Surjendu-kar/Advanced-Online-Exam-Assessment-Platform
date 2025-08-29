"use client";

interface ExamBasicInfoProps {
  examTitle: string;
  examDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export default function ExamBasicInfo({
  examTitle,
  examDescription,
  onTitleChange,
  onDescriptionChange,
}: ExamBasicInfoProps) {
  return (
    <div className="space-y-4 py-2">
      <input
        type="text"
        required
        placeholder="Exam Title"
        value={examTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
      />
      <textarea
        placeholder="Exam Description (Optional)"
        value={examDescription}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 p-3 rounded-md placeholder-gray-400 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
      />
    </div>
  );
}
