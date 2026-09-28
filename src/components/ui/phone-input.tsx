"use client";

import { useId } from "react";

// Fixed +251 prefix per the country-code decision (docs/redesign/decisions.md
// Q2) — this app only ever serves Ethiopian phone numbers.
interface PhoneInputProps {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, label, id, autoFocus, placeholder }: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="type-field-label block text-muted">
          {label}
        </label>
      )}
      <div className="grid h-14 grid-cols-[72px_1fr] border-2 border-rule-2 bg-surface focus-within:border-fill">
        <div className="flex items-center justify-center border-r border-rule type-body text-muted">
          +251
        </div>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder={placeholder ?? "9XX XXX XXX"}
          className="bg-transparent px-4 text-[19px] font-medium tracking-[0.04em] text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
