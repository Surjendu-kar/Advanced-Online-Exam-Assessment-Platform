"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface Question {
  id: string;
  type: "mcq" | "saq" | "coding";
  question_text: string;
  marks: number;
  order: number;
  data: any;
}

interface QuestionAccordionProps {
  question: Question;
  index: number;
  totalQuestions: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onUpdate: (questionId: string, updatedData: any) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  isOpen: boolean;
  onToggle: (questionId: string) => void;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelection: (questionId: string) => void;
  isNewlyAdded?: boolean;
}

export default function QuestionAccordion({
  question,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onUpdate,
  isDragging,
  isDropTarget,
  isOpen,
  onToggle,
  isDeleteMode,
  isSelected,
  onToggleSelection,
  isNewlyAdded = false,
}: QuestionAccordionProps) {
  const [editData, setEditData] = useState(question.data);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragOver(-1);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(index);
  };

  return (
    /* Main container with delete mode checkbox */
    <div className="flex items-start space-x-3">
      {/* Delete mode checkbox - appears on left when delete mode is active */}
      {isDeleteMode && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mt-3"
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(question.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </motion.div>
      )}

      {/* Main accordion container */}
      <motion.div
        layout
        initial={isNewlyAdded ? { opacity: 0, x: -120, scale: 0.95 } : false}
        animate={{
          paddingLeft: 0,
          opacity: 1,
          x: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          x: 120,
          scale: 0.95,
        }}
        transition={{
          duration: isNewlyAdded ? 0 : 0.2,
          
        }}
        className={`border rounded-lg transition-all duration-200 flex-1 ${
          isDragging
            ? "opacity-50 transform scale-95 border-blue-300"
            : isDropTarget
            ? "border-blue-400 bg-blue-50"
            : isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Accordion header - clickable area to toggle open/close */}
        <div
          className="p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={() => onToggle(question.id)}
        >
          <div className="flex justify-between items-start">
            {/* Left side - Question info (Q1, MCQ, points) */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                Q{question.order}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {question.type.toUpperCase()}
              </span>
              <span className="text-xs text-blue-600 font-medium">
                {question.marks} point{question.marks !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Right side - Control icons (chevron and drag handle) */}
            <div
              className="flex items-center space-x-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chevron icon - rotates to indicate open/closed state */}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-in-out ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>

              {/* Drag handle - only visible when not in delete mode */}
              {!isDeleteMode && (
                <button
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={onDragEnd}
                  className="text-gray-400 hover:text-gray-600 cursor-move hover:bg-gray-100 rounded p-1 transition-colors duration-200"
                  title="Drag to reorder"
                >
                  ⋮⋮
                </button>
              )}
            </div>
          </div>

          {/* Question preview text - only shown when accordion is closed */}
          {!isOpen && (
            <p className="text-sm text-gray-700 line-clamp-2 mt-2">
              {question.question_text}
            </p>
          )}
        </div>

        {/* Accordion content - expandable form area */}
        <div
          className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className={`p-3 transition-all duration-300 ease-in-out ${
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
          >
            {/* MCQ (Multiple Choice Question) form */}
            {question.type === "mcq" && (
              <div className="space-y-3">
                {/* Question text input */}
                <textarea
                  placeholder="Enter question text..."
                  value={editData.question_text}
                  onChange={(e) =>
                    setEditData({ ...editData, question_text: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* MCQ options list */}
                {editData.options?.map((option: string, optIndex: number) => (
                  <div key={optIndex} className="flex items-center space-x-2">
                    {/* Option text input */}
                    <input
                      placeholder={`Option ${optIndex + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editData.options];
                        newOptions[optIndex] = e.target.value;
                        setEditData({ ...editData, options: newOptions });
                      }}
                      className="flex-1 border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                    />
                    {/* Correct answer radio button */}
                    <input
                      type="radio"
                      name="correct_option"
                      checked={editData.correct_option === optIndex}
                      onChange={() =>
                        setEditData({ ...editData, correct_option: optIndex })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  </div>
                ))}

                {/* Points input */}
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Points"
                  value={editData.marks}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      marks: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Update button */}
                <button
                  onClick={() => {
                    onUpdate(question.id, editData);
                    onToggle(question.id);
                  }}
                  className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Update Question
                </button>
              </div>
            )}

            {/* SAQ (Short Answer Question) form */}
            {question.type === "saq" && (
              <div className="space-y-3">
                {/* Question text input */}
                <textarea
                  placeholder="Enter question text..."
                  value={editData.question_text}
                  onChange={(e) =>
                    setEditData({ ...editData, question_text: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Expected answer input */}
                <textarea
                  placeholder="Expected answer..."
                  value={editData.correct_answer}
                  onChange={(e) =>
                    setEditData({ ...editData, correct_answer: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Points input */}
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Points"
                  value={editData.marks}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      marks: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Update button */}
                <button
                  onClick={() => {
                    onUpdate(question.id, editData);
                    onToggle(question.id);
                  }}
                  className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Update Question
                </button>
              </div>
            )}

            {/* Coding Question form */}
            {question.type === "coding" && (
              <div className="space-y-3">
                {/* Question text input */}
                <textarea
                  placeholder="Enter question text..."
                  value={editData.question_text}
                  onChange={(e) =>
                    setEditData({ ...editData, question_text: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Programming language selector */}
                <select
                  value={editData.language}
                  onChange={(e) =>
                    setEditData({ ...editData, language: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>

                {/* Starter code input */}
                <textarea
                  placeholder="Starter code (optional)..."
                  value={editData.starter_code}
                  onChange={(e) =>
                    setEditData({ ...editData, starter_code: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm font-mono"
                />

                {/* Expected output input */}
                <textarea
                  placeholder="Expected output..."
                  value={editData.expected_output}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      expected_output: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm font-mono"
                />

                {/* Points input */}
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Points"
                  value={editData.marks}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      marks: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md placeholder-gray-400 text-black focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                />

                {/* Update button */}
                <button
                  onClick={() => {
                    onUpdate(question.id, editData);
                    onToggle(question.id);
                  }}
                  className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Update Question
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export type { Question };
