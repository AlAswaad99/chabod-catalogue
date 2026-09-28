"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Desktop-only (§4.10): each recording gets its own 44px play/pause square
// and progress bar in the right column, replacing the single-track
// DockedPlayer that phone/tablet use instead.
export function RecordingRow({ url, filename }: { url: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
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

  function toggle() {
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

  return (
    <div className="flex items-center gap-3 py-2.5">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-11 w-11 shrink-0 items-center justify-center bg-fill text-on-fill"
      >
        {playing ? <Pause size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="type-meta truncate text-ink">{filename}</p>
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
