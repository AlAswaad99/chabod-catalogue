// Extracted from build-deck.ts so the slide generator's live preview can
// compute the exact same slide count client-side without pulling pptxgenjs
// into the browser bundle.
export function chunkLines(text: string, maxLines: number): string[][] {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines));
  }
  return chunks.length > 0 ? chunks : [[]];
}
