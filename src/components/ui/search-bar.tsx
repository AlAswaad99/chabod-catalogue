"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder, autoFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex h-[52px] items-center gap-2 border-2 border-fill bg-surface px-3">
      <Search size={20} strokeWidth={2} className="shrink-0 text-fill" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search"}
        className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <span className="hidden h-6 shrink-0 items-center border border-rule-2 px-1.5 type-mono text-muted desktop:flex">
          /
        </span>
      )}
    </div>
  );
}
