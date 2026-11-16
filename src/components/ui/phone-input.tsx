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
        <label htmlFor={inputId} className="type-field-label block text-muted-foreground">
          {label}
        </label>
      )}
      <div className="grid h-12 grid-cols-[72px_1fr] overflow-hidden rounded-md border border-input bg-card shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
        <div className="flex items-center justify-center border-r border-rule type-body text-muted-foreground">
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
          className="bg-transparent px-4 text-[18px] font-medium tracking-[0.04em] text-ink placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
