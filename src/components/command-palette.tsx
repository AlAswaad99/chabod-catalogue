"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Plus, Presentation, Tag, Upload, Users } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchableSong } from "@/lib/search/rank";

const ADMIN_ACTIONS = [
  { href: "/admin/songs/new", icon: Plus, name: "Add song" },
  { href: "/admin/slides", icon: Presentation, name: "Slides" },
  { href: "/admin/import", icon: Upload, name: "Import lyrics" },
  { href: "/admin/members", icon: Users, name: "Members" },
  { href: "/admin/metadata-fields", icon: Tag, name: "Metadata fields" },
];

// Ctrl/⌘K jump menu (cmdk). Type a number or part of a title to open that song
// without touching the list; admins also get shortcuts to their tools. The list
// search stays the place for lyrics/metadata searching.
export function CommandPalette({
  songs,
  isAdmin,
}: {
  songs: SearchableSong[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to"
      description="Search songs by number or title"
    >
      <Command>
        <CommandInput placeholder="Jump to a song by number or title…" />
        <CommandList>
          <CommandEmpty>No song found.</CommandEmpty>
          <CommandGroup heading="Songs">
            {songs.map((song) => (
              <CommandItem
                key={song.id}
                value={`${song.number} ${String(song.number).padStart(3, "0")} ${song.title}`}
                onSelect={() => go(`/songs/${song.id}`)}
              >
                <Music aria-hidden />
                <span className="type-mono w-9 shrink-0 text-muted-foreground">
                  {String(song.number).padStart(3, "0")}
                </span>
                <span className="truncate">{song.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {isAdmin && (
            <CommandGroup heading="Admin">
              {ADMIN_ACTIONS.map((a) => (
                <CommandItem
                  key={a.href}
                  value={`admin ${a.name}`}
                  onSelect={() => go(a.href)}
                >
                  <a.icon aria-hidden />
                  {a.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
