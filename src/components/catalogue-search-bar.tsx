"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";

const DEBOUNCE_MS = 150;

export function CatalogueSearchBar({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (next.trim()) params.set("q", next.trim());
      router.replace(`/catalogue${params.toString() ? `?${params}` : ""}`);
    }, DEBOUNCE_MS);
  }

  return (
    <SearchBar value={value} onChange={handleChange} placeholder="Search title, lyrics, or metadata…" />
  );
}
