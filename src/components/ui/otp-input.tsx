"use client";

import { useRef, useState } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  length?: number;
  disabled?: boolean;
}

// Backed by one invisible real <input>, per §3.5 — the visible cells are
// purely decorative and never receive focus/input themselves.
export function OtpInput({
  value,
  onChange,
  onComplete,
  autoFocus,
  length = 6,
  disabled,
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div
      className="relative grid h-[60px] cursor-text border-2 border-rule-2 bg-surface"
      style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}
      onClick={() => inputRef.current?.focus()}
    >
      {cells.map((digit, i) => {
        const isActive = focused && i === activeIndex;
        return (
          <div
            key={i}
            className={`relative flex items-center justify-center text-[26px] font-extrabold text-ink ${i > 0 ? "border-l border-rule" : ""}`}
          >
            {digit || (isActive && <span className="h-7 w-[2px] bg-fill" aria-hidden />)}
            {isActive && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-fill" aria-hidden />}
          </div>
        );
      })}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 cursor-text opacity-0 disabled:cursor-not-allowed"
        aria-label="One-time code"
      />
    </div>
  );
}
