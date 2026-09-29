"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { annotateSections } from "@/lib/lyrics";
import { useReadingSize } from "@/lib/reading-size";
import { LyricSection } from "@/components/ui/lyric-section";
import type { LyricsSection } from "@/types/song";

// Wake Lock is feature-detected (not every browser has it) — best-effort,
// re-acquired if the tab was hidden when it got released. Scoped to this
// component's lifetime, i.e. while a song's lyrics are on screen.
function useWakeLockWhileMounted() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lock = sentinel;
      } catch {
        // Denied or unsupported in this context — reading still works.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible" && !lock) void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void lock?.release();
    };
  }, []);
}

export function SongLyrics({ sections }: { sections: LyricsSection[] }) {
  const [size] = useReadingSize();
  useWakeLockWhileMounted();

  const annotated = annotateSections(sections);

  return (
    <div
      className="space-y-5 px-5 pb-8 pt-[22px] tablet:max-w-[560px] desktop:max-w-none"
      style={{ "--lyrics-size": `${size}px` } as CSSProperties}
    >
      {annotated.map((section, i) => (
        <LyricSection
          key={i}
          type={section.type}
          label={section.label}
          text={section.text}
          verseNumber={section.verseNumber}
          isRepeat={section.isRepeat}
        />
      ))}
    </div>
  );
}
