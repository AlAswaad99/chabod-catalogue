import type { LyricsSection } from "@/types/song";

export interface AnnotatedSection extends LyricsSection {
  verseNumber?: number;
  isRepeat: boolean;
}

// A repeated chorus (or any repeated section) is represented today by a
// literal duplicate {type, text} entry in the stored order — no schema
// change, per docs/redesign/inventory.md. This flags every occurrence
// after the first as a repeat so LyricSection can render it as a
// collapsed row instead of the full text again.
export function annotateSections(sections: LyricsSection[]): AnnotatedSection[] {
  const seen = new Set<string>();
  let verseCount = 0;
  return sections.map((section) => {
    const key = `${section.type}::${section.text}`;
    const isRepeat = seen.has(key);
    seen.add(key);
    if (section.type === "verse" && !isRepeat) verseCount++;
    return {
      ...section,
      verseNumber: section.type === "verse" ? verseCount : undefined,
      isRepeat,
    };
  });
}
