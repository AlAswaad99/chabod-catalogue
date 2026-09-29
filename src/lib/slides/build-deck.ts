import PptxGenJS from "pptxgenjs";
import type { SlideDeckSpec } from "./types";
import { chunkLines } from "./chunk-lines";

// Measurements and colors lifted from the choir's own reference deck
// ("Chabod Meskerem Ale! Yahweh, Betalakenetu"), so generated decks match
// their existing house style: plain white background, bold black text,
// a thin accent-colored divider line under each title.
const CHOIR_NAME = "ካቦድ መዘምራን";
const COLOR_TEXT = "000000";
const COLOR_ACCENT = "158158";
const COLOR_BACKGROUND = "FFFFFF";

const TITLE_BOX = { x: 1.27, y: 0.81, w: 9.32, h: 2.24 };
const DIVIDER_LINE = { x: 1.11, y: 3.06, w: 3.69, y2: 3.06 };
const SUBTITLE_BOX = { x: 1.27, y: 3.29, w: 9.32, h: 0.87 };
const DATE_BOX = { x: 7.08, y: 5.02, w: 2.57, h: 0.51 };
const LYRICS_BOX = { x: 0, y: 0.25, w: 10, h: 5.38 };

function titleFontSize(text: string): number {
  if (text.length <= 6) return 80;
  if (text.length <= 12) return 60;
  if (text.length <= 20) return 46;
  return 36;
}

function addTitleSlide(pres: PptxGenJS, title: string, subtitle: string, date?: string) {
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BACKGROUND };

  slide.addText(title, {
    ...TITLE_BOX,
    isTextBox: true,
    fontSize: titleFontSize(title),
    bold: true,
    color: COLOR_TEXT,
    align: "left",
    valign: "bottom",
    fit: "shrink",
    margin: 0,
  });

  slide.addShape(pres.ShapeType.line, {
    x: DIVIDER_LINE.x,
    y: DIVIDER_LINE.y,
    w: DIVIDER_LINE.w,
    h: 0,
    line: { color: COLOR_ACCENT, width: 0.75 },
  });

  slide.addText(subtitle, {
    ...SUBTITLE_BOX,
    isTextBox: true,
    fontSize: 41,
    color: COLOR_TEXT,
    align: "left",
    valign: "top",
    margin: 0,
  });

  if (date) {
    slide.addText(date, {
      ...DATE_BOX,
      isTextBox: true,
      fontSize: 18,
      italic: true,
      color: COLOR_ACCENT,
      align: "left",
      valign: "top",
      margin: 0,
    });
  }
}

function addLyricsSlide(pres: PptxGenJS, lines: string[]) {
  const slide = pres.addSlide();
  slide.background = { color: COLOR_BACKGROUND };

  slide.addText(
    lines.map((text, i) => ({
      text,
      options: { breakLine: i < lines.length - 1 },
    })),
    {
      ...LYRICS_BOX,
      isTextBox: true,
      fontSize: 54,
      bold: true,
      color: COLOR_TEXT,
      align: "center",
      valign: "top",
      fit: "shrink",
      margin: 0,
    },
  );
}

export async function buildSlideDeck(spec: SlideDeckSpec): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";

  addTitleSlide(pres, spec.deckTitle, CHOIR_NAME, spec.date);

  for (const song of spec.songs) {
    addTitleSlide(pres, song.title, CHOIR_NAME);
    for (const section of song.sections) {
      for (const chunk of chunkLines(section.text, spec.maxLinesPerSlide)) {
        addLyricsSlide(pres, chunk);
      }
    }
  }

  addTitleSlide(pres, spec.closingPhrase, CHOIR_NAME);

  const buffer = await pres.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}
