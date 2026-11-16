"use client";

import Link, { useLinkStatus } from "next/link";

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
      <span className="text-brand">{title.slice(match.start, match.end)}</span>
      {title.slice(match.end)}
    </>
  );
}

// Instant tap feedback: the moment the link is clicked, the row tints while the
// song streams in (the route's loading.tsx takes over the right-hand pane).
// Without this, a slow response looks like a dead tap and people tap twice.
function PendingTint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 bg-fill/10 transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

export function SongRow({ href, number, title, titleMatch, matchBadge, snippet, metaLine, selected }: SongRowProps) {
  return (
    <Link
      href={href}
      className={`relative grid grid-cols-[52px_1fr] items-start gap-2 border-b border-rule py-3 pr-3 ${
        selected ? "bg-secondary before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-fill" : ""
      }`}
    >
      <PendingTint />
      <span className={`type-mono pt-0.5 ${selected ? "text-brand" : "text-muted-foreground"}`}>
        {String(number).padStart(3, "0")}
      </span>
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="type-list-title min-w-0 truncate text-ink">{renderTitle(title, titleMatch)}</p>
          {matchBadge && <span className="type-badge shrink-0 text-label">{matchBadge}</span>}
        </div>
        {snippet && (
          <p className="type-body truncate text-muted-foreground">
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
