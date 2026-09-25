import type { LyricsSectionType } from "@/types/song";

export interface ArrangedSection {
  type: LyricsSectionType;
  text: string;
}

export interface ArrangedSong {
  title: string;
  sections: ArrangedSection[];
}

export interface SlideDeckSpec {
  deckTitle: string;
  date: string;
  closingPhrase: string;
  maxLinesPerSlide: number;
  songs: ArrangedSong[];
}
