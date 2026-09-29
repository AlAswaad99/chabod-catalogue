"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export interface DockedPlayerRecording {
  id: string;
  url: string;
  filename: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Hidden entirely if there are no recordings (§3.13). Duration/elapsed are
// read from the real <audio> element (Q3 — client-only, no stored column).
export function DockedPlayer({
  recordings,
  /** True when an admin's BottomNav is also on screen (phone/tablet only —
   * it's replaced by DesktopRail at the desktop breakpoint), so this needs
   * to dock above it instead of overlapping at the same bottom-0 edge. */
  aboveBottomNav,
  /** True on song detail, where the 768-1199px tablet split-view puts a
   * 380px+2px-border list column to the left — the player should start
   * after it ("spanning the right column", §4.10) instead of full-bleed. */
  spanTabletRightColumn,
}: {
  recordings: DockedPlayerRecording[];
  aboveBottomNav?: boolean;
  spanTabletRightColumn?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = recordings[index];

  useEffect(() => {
    // Q11b: pause when the tab/app is hidden. Also pause on unmount
    // (leaving the song), per §3.13.
    const audioEl = audioRef.current;
    function handleVisibility() {
      if (document.hidden) audioEl?.pause();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      audioEl?.pause();
    };
  }, []);

  if (!current) return null;

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else void audioRef.current.play();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  }

  function nextTrack() {
    setIndex((i) => (i + 1) % recordings.length);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  return (
    <div
      className={`fixed left-0 right-0 z-20 grid h-[72px] grid-cols-[64px_1fr] border-t-2 border-fill bg-surface ${
        spanTabletRightColumn ? "tablet:left-[382px] desktop:left-0" : ""
      } ${
        aboveBottomNav
          ? "bottom-[72px] desktop:bottom-0 desktop:pb-[env(safe-area-inset-bottom)]"
          : "bottom-0 pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      <audio
        key={current.id}
        ref={audioRef}
        src={current.url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex items-center justify-center bg-fill text-on-fill"
      >
        {playing ? <Pause size={22} strokeWidth={2} /> : <Play size={22} strokeWidth={2} />}
      </button>
      <div className="flex min-w-0 flex-col justify-center gap-1.5 px-3">
        <div className="flex items-center justify-between gap-2">
          <p className="type-meta min-w-0 truncate text-ink">{current.filename}</p>
          {recordings.length > 1 && (
            <button type="button" onClick={nextTrack} className="type-mono shrink-0 text-muted">
              {index + 1} of {recordings.length} ›
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div onClick={seek} className="h-[3px] flex-1 cursor-pointer bg-rule">
            <div
              className="h-full bg-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>
          <span className="type-mono shrink-0 text-[11px] text-muted">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
