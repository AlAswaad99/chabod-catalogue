import type { LyricsSectionType } from "@/types/song";

const TAG_MAP: Partial<Record<LyricsSectionType, string>> = {
  bridge: "BR",
  intro: "IN",
  outro: "OUT",
  other: "•",
};

function parseIndented(text: string): { main: string; indented: string | null } {
  const parts = text.split(/\n\s*\n/);
  if (parts.length > 1) {
    return { main: parts[0], indented: parts.slice(1).join("\n\n") };
  }
  return { main: text, indented: null };
}

interface LyricSectionProps {
  type: LyricsSectionType;
  label?: string;
  text: string;
  verseNumber?: number;
}

export function LyricSection({ type, label, text, verseNumber }: LyricSectionProps) {
  const { main, indented } = parseIndented(text);
  const isChorus = type === "chorus";

  const marker =
    type === "verse" ? (
      <span className="type-mono text-accent">{String(verseNumber ?? 1).padStart(2, "0")}</span>
    ) : isChorus ? (
      <span style={{ fontFamily: "var(--font-noto-ethiopic)" }} className="text-[13px] font-bold text-label">
        አዝ
      </span>
    ) : (
      <span className="type-mono text-accent">{TAG_MAP[type] ?? "•"}</span>
    );

  const body = (
    <div className="grid grid-cols-[40px_1fr] gap-2">
      <div className="pt-0.5">{marker}</div>
      <div className="min-w-0">
        {label && <p className="type-section-label mb-1">{label}</p>}
        <p className="type-lyrics whitespace-pre-wrap text-ink">{main}</p>
        {indented && <p className="type-lyrics whitespace-pre-wrap pl-5 pt-2 text-ink">{indented}</p>}
      </div>
    </div>
  );

  // Full-bleed chorus band: negative margin cancels the reading column's
  // 20px side padding, then re-adds it inside so text still aligns.
  if (isChorus) {
    return <div className="-mx-5 bg-band px-5 py-3.5">{body}</div>;
  }
  return body;
}
