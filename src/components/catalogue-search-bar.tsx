"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";

const DEBOUNCE_MS = 150;

// Used on both /catalogue and /songs/[id] (the tablet split-view's list
// column lives on both routes) — navigates relative to whichever page it's
// rendered on, so searching from an open song's tablet list filters that
// list in place instead of leaving the song (§4.10: "Searching filters the
// list without closing the open song").
export function CatalogueSearchBar({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
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
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
    }, DEBOUNCE_MS);
  }

  return (
    <SearchBar value={value} onChange={handleChange} placeholder="Search title, lyrics, or metadata…" />
  );
}
