import Link from "next/link";

interface SongRowProps {
  href: string;
  number: number;
  title: string;
  /** Character range within `title` to render in --accent (a search-match highlight). */
  titleMatch?: { start: number; end: number };
  matchBadge?: string;
  snippet?: { before: string; hit: string; after: string };
  metaLine?: string;
  selected?: boolean;
}

function renderTitle(title: string, match?: { start: number; end: number }) {
  if (!match) return title;
  return (
    <>
      {title.slice(0, match.start)}
      <span className="text-accent">{title.slice(match.start, match.end)}</span>
      {title.slice(match.end)}
    </>
  );
}

export function SongRow({ href, number, title, titleMatch, matchBadge, snippet, metaLine, selected }: SongRowProps) {
  return (
    <Link
      href={href}
      className={`grid grid-cols-[52px_1fr] items-start gap-2 border-b border-rule py-3 pr-3 ${
        selected ? "relative bg-surface before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-fill" : ""
      }`}
    >
      <span className={`type-mono pt-0.5 ${selected ? "text-accent" : "text-muted"}`}>
        {String(number).padStart(3, "0")}
      </span>
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="type-list-title min-w-0 truncate text-ink">{renderTitle(title, titleMatch)}</p>
          {matchBadge && <span className="type-badge shrink-0 text-label">{matchBadge}</span>}
        </div>
        {snippet && (
          <p className="type-body truncate text-muted">
            …{snippet.before}
            <mark className="bg-hl text-hl-text">{snippet.hit}</mark>
            {snippet.after}…
          </p>
        )}
        {metaLine && <p className="type-meta">{metaLine}</p>}
      </div>
    </Link>
  );
}
