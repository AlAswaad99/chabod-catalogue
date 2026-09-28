"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "w-full border border-rule-2 px-4 type-body text-ink placeholder:text-muted focus:border-fill focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed";

interface FieldWrapperProps {
  label?: string;
  inset?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={htmlFor} className="type-field-label block text-muted">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Use bg-ground instead of bg-surface — for a field placed inside an already-surface-colored card. */
  inset?: boolean;
  /** 44-48px instead of the default 56px, per §2.3's "compact inputs" note. */
  compact?: boolean;
}

export function TextInput({ label, inset, compact, className, id, ...props }: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId}>
      <input
        id={inputId}
        className={`${FIELD_BASE} ${compact ? "h-12" : "h-14"} ${inset ? "bg-ground" : "bg-surface"} ${className ?? ""}`}
        {...props}
      />
    </FieldWrapper>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  inset?: boolean;
}

export function TextArea({ label, inset, className, id, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId}>
      <textarea
        id={inputId}
        className={`${FIELD_BASE} type-lyrics min-h-28 resize-y py-3 ${inset ? "bg-ground" : "bg-surface"} ${className ?? ""}`}
        {...props}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  inset?: boolean;
  compact?: boolean;
}

export function Select({ label, inset, compact, className, id, children, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId}>
      <select
        id={inputId}
        className={`${FIELD_BASE} appearance-none ${compact ? "h-12" : "h-14"} ${inset ? "bg-ground" : "bg-surface"} ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
