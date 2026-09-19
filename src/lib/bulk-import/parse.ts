import type { LyricsSection, MetadataFieldType } from "@/types/song";

export interface MetadataGuess {
  fieldName: string;
  fieldType: MetadataFieldType;
  value: string;
}

export interface ParsedSongDraft {
  id: string;
  title: string;
  titleIsGuess: boolean;
  lyrics: LyricsSection[];
  metadataGuesses: MetadataGuess[];
  rawBlock: string;
}

// Maps a recognized "🎤 Label, Value" tag to one of our metadata fields.
// Everything else (no comma, or an unrecognized label) becomes a free-form
// note instead of being silently dropped.
const LABEL_FIELD_MAP: Record<string, { fieldName: string; fieldType: MetadataFieldType }> = {
  "time sign": { fieldName: "Time Signature", fieldType: "single_select" },
  "time signature": { fieldName: "Time Signature", fieldType: "single_select" },
  "key sign": { fieldName: "Key", fieldType: "single_select" },
  key: { fieldName: "Key", fieldType: "single_select" },
  genre: { fieldName: "Genre", fieldType: "single_select" },
  form: { fieldName: "Form", fieldType: "single_select" },
  "chant type": { fieldName: "Chant Type", fieldType: "single_select" },
};

interface RawDraft {
  contentLines: string[];
  tagLines: string[];
}

// Splits raw pasted text into song-sized chunks. A run of 🎤-tagged lines is
// always metadata for whatever song content follows it, no matter how many
// (or how few) blank lines separate them from the surrounding text — that
// turned out to be the only reliable signal, since blank-line spacing around
// a tag cluster is inconsistent in real pastes. Absent any tags, a run of 2+
// blank lines is treated as a song boundary; a single blank line is treated
// as a verse/paragraph break within the same song.
function splitIntoRawDrafts(raw: string): RawDraft[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const drafts: RawDraft[] = [];

  let mode: "content" | "metadata" = "content";
  let currentContent: string[] = [];
  let currentTags: string[] = [];
  let blankRun = 0;

  function flush() {
    const hasContent = currentContent.some((l) => l.trim() !== "");
    const hasTags = currentTags.length > 0;
    if (hasContent || hasTags) {
      drafts.push({ contentLines: currentContent, tagLines: currentTags });
    }
    currentContent = [];
    currentTags = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const isTag = trimmed.startsWith("🎤");

    if (isTag) {
      if (mode === "content" && currentContent.some((l) => l.trim() !== "")) {
        flush();
      }
      mode = "metadata";
      currentTags.push(trimmed);
      blankRun = 0;
      continue;
    }

    if (trimmed === "") {
      blankRun++;
      if (mode === "content") currentContent.push(line);
      continue;
    }

    if (mode === "metadata") {
      mode = "content";
      currentContent = [line];
      blankRun = 0;
      continue;
    }

    if (blankRun >= 2 && currentContent.some((l) => l.trim() !== "")) {
      flush();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
    blankRun = 0;
  }
  flush();

  return drafts;
}

function isChorusMarker(firstLine: string): boolean {
  const stripped = firstLine.replace(/[.…]+$/, "").trim();
  return stripped === "አዝ" || stripped.startsWith("አዝማች") || /^cho(rus)?$/i.test(stripped);
}

function parseVerseNumber(firstLine: string): { number: string; rest: string } | null {
  const match = firstLine.match(/^(\d{1,2})[.)]?\s*/);
  if (!match) return null;
  return { number: match[1], rest: firstLine.slice(match[0].length) };
}

function parseTagLines(tagLines: string[]): { titleOverride: string | null; metadataGuesses: MetadataGuess[] } {
  let titleOverride: string | null = null;
  const metadataGuesses: MetadataGuess[] = [];
  const notes: string[] = [];

  for (const tagLine of tagLines) {
    const withoutEmoji = tagLine.replace(/^🎤+\s*/, "").trim();
    const commaIdx = withoutEmoji.indexOf(",");

    if (commaIdx === -1) {
      notes.push(withoutEmoji);
      continue;
    }

    const label = withoutEmoji.slice(0, commaIdx).trim().toLowerCase();
    const value = withoutEmoji
      .slice(commaIdx + 1)
      .trim()
      .replace(/\.$/, "");

    if (label === "title") {
      titleOverride = value;
      continue;
    }

    const mapped = LABEL_FIELD_MAP[label];
    if (mapped && value) {
      metadataGuesses.push({ fieldName: mapped.fieldName, fieldType: mapped.fieldType, value });
    } else {
      notes.push(withoutEmoji);
    }
  }

  if (notes.length > 0) {
    metadataGuesses.push({ fieldName: "Notes", fieldType: "text", value: notes.join("; ") });
  }

  return { titleOverride, metadataGuesses };
}

function parseLyrics(contentLines: string[]): LyricsSection[] {
  const contentText = contentLines.join("\n").trim();
  const paragraphs = contentText
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const lyrics: LyricsSection[] = [];

  for (const paragraph of paragraphs) {
    const paraLines = paragraph.split("\n");
    const firstLine = paraLines[0].trim();

    if (isChorusMarker(firstLine)) {
      const rest = paraLines.slice(1).join("\n").trim();
      if (!rest) {
        // Bare repeat marker ("chorus repeats here") with no new text — the
        // chorus was already written out once earlier in this song.
        continue;
      }
      lyrics.push({ type: "chorus", label: "Chorus", text: rest });
      continue;
    }

    const verseNumber = parseVerseNumber(firstLine);
    if (verseNumber) {
      const text = [verseNumber.rest, ...paraLines.slice(1)].join("\n").trim();
      lyrics.push({ type: "verse", label: `Verse ${verseNumber.number}`, text });
    } else {
      lyrics.push({ type: "verse", text: paragraph });
    }
  }

  return lyrics.length > 0 ? lyrics : [{ type: "verse", text: contentText }];
}

function toDraft(raw: RawDraft): Omit<ParsedSongDraft, "id"> {
  const { titleOverride, metadataGuesses } = parseTagLines(raw.tagLines);
  const lyrics = parseLyrics(raw.contentLines);
  const firstLineOfContent = raw.contentLines.find((l) => l.trim() !== "")?.trim() ?? "";
  const fallbackTitle = parseVerseNumber(firstLineOfContent)?.rest || firstLineOfContent;

  return {
    title: titleOverride ?? (fallbackTitle.slice(0, 60) || "Untitled song"),
    titleIsGuess: titleOverride === null,
    lyrics,
    metadataGuesses,
    rawBlock: [...raw.tagLines, ...raw.contentLines].join("\n"),
  };
}

export function parseBulkImportText(raw: string): ParsedSongDraft[] {
  return splitIntoRawDrafts(raw).map((rawDraft) => ({
    id: crypto.randomUUID(),
    ...toDraft(rawDraft),
  }));
}
