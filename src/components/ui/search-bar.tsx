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

  // "/" focuses the search from anywhere (Ctrl/⌘K does the same via the
  // command palette, which can also jump straight to a song).
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
    <div className="flex h-12 items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
      <Search size={19} strokeWidth={2} className="shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search"}
        aria-label={placeholder ?? "Search"}
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <span className="hidden h-6 shrink-0 items-center rounded-sm border border-input px-1.5 type-mono text-muted-foreground desktop:flex">
          /
        </span>
      )}
    </div>
  );
}
