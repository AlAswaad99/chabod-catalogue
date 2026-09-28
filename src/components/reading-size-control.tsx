"use client";

import { Minus, Plus } from "lucide-react";
import { useReadingSize, READING_SIZE_MIN, READING_SIZE_MAX, READING_SIZE_STEP } from "@/lib/reading-size";

// "One bordered pair of 44×40 cells" (§4.3).
export function ReadingSizeControl() {
  const [size, setSize] = useReadingSize();

  return (
    <div className="flex h-10 border-2 border-rule-2">
      <button
        type="button"
        aria-label="Decrease lyrics text size"
        disabled={size <= READING_SIZE_MIN}
        onClick={() => setSize(size - READING_SIZE_STEP)}
        className="flex w-11 items-center justify-center border-r border-rule-2 text-ink disabled:opacity-45"
      >
        <Minus size={16} strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Increase lyrics text size"
        disabled={size >= READING_SIZE_MAX}
        onClick={() => setSize(size + READING_SIZE_STEP)}
        className="flex w-11 items-center justify-center text-ink disabled:opacity-45"
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
