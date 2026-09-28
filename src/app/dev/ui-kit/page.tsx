"use client";

// Throwaway visual-review page for redesign steps 4-5 — deleted before the
// acceptance pass (plan.md step 17). Not linked from anywhere.
import { useState } from "react";
import { Plus, Search as SearchIcon, Trash2 } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { TextInput, TextArea, Select } from "@/components/ui/text-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { OtpInput } from "@/components/ui/otp-input";
import { SearchBar } from "@/components/ui/search-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { SongRow } from "@/components/ui/song-row";
import { MetaGrid } from "@/components/ui/meta-grid";
import { LyricSection } from "@/components/ui/lyric-section";
import { DockedPlayer } from "@/components/ui/docked-player";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { TopBar } from "@/components/ui/top-bar";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import { annotateSections } from "@/lib/lyrics";
import { setTheme, getTheme } from "@/lib/theme";

const TEST_SECTIONS = annotateSections([
  { type: "verse", label: "Verse 1", text: "ሰም እና ወርቅ ሆኖ ህይወት ቢፈትንህ\nሰላም እረፍት ጠፍቶ ሁኔታ ቢጫንህ" },
  { type: "chorus", text: "ቃል ስጋ ሆኖ ወርዶ አድኖናል\nበትንሳኤው ሀይል ለኛ ሰቶናል" },
  { type: "verse", label: "Verse 2", text: "ነገን አስበህ ዛሬ ብትሮጥም\n\nየሀዘን ሆድ ውጦህ ተስፋ ብታጣ" },
  { type: "chorus", text: "ቃል ስጋ ሆኖ ወርዶ አድኖናል\nበትንሳኤው ሀይል ለኛ ሰቶናል" },
]);

function ToastDemo() {
  const { showToast } = useToast();
  return (
    <Button variant="secondary" fullWidth={false} onClick={() => showToast("Song saved")}>
      Trigger toast
    </Button>
  );
}

export default function UiKitPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [search, setSearch] = useState("");
  const [seg, setSeg] = useState<"member" | "admin">("member");
  const [type, setType] = useState<"text" | "number" | "single" | "multi">("text");
  const [chip1, setChip1] = useState(false);

  return (
    <ToastProvider>
    <div className="min-h-dvh space-y-8 bg-ground p-6 text-ink">
      <div className="flex items-center justify-between">
        <Wordmark size={40} />
        <Button
          variant="secondary"
          fullWidth={false}
          onClick={() => setTheme(getTheme() === "dark" ? "light" : "dark")}
        >
          Toggle theme
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="type-section-label">Buttons</h2>
        <div className="max-w-sm space-y-2">
          <Button variant="primary" icon={Plus}>
            Add song
          </Button>
          <Button variant="secondary" icon={SearchIcon}>
            Secondary
          </Button>
          <Button variant="text">Text button</Button>
          <Button variant="danger" icon={Trash2}>
            Delete
          </Button>
          <Button variant="danger-confirm" icon={Trash2}>
            Tap again to remove
          </Button>
          <Button variant="icon" icon={Plus} aria-label="Add" />
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">Inputs</h2>
        <TextInput label="Title" placeholder="Song title" />
        <TextArea label="Lyrics" placeholder="One line per row" />
        <Select label="Type">
          <option>Verse</option>
          <option>Chorus</option>
        </Select>
        <PhoneInput label="Phone" value={phone} onChange={setPhone} />
        <OtpInput value={otp} onChange={setOtp} autoFocus={false} />
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">Search</h2>
        <SearchBar value={search} onChange={setSearch} placeholder="Search songs" />
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">Segmented control</h2>
        <SegmentedControl
          aria-label="Role"
          value={seg}
          onChange={setSeg}
          options={[
            { value: "member", label: "Member" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <SegmentedControl
          aria-label="Field type"
          grid
          value={type}
          onChange={setType}
          options={[
            { value: "text", label: "Text" },
            { value: "number", label: "Number" },
            { value: "single", label: "Single-select" },
            { value: "multi", label: "Multi-select" },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h2 className="type-section-label">Chips</h2>
        <div className="flex gap-2">
          <Chip label="C" selected={chip1} onClick={() => setChip1((v) => !v)} />
          <Chip label="D" onRemove={() => {}} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="type-section-label">Badges</h2>
        <div className="flex gap-3">
          <Badge variant="match">TITLE</Badge>
          <Badge variant="role-admin">ADMIN</Badge>
          <Badge variant="role-member">MEMBER</Badge>
          <Badge variant="warn">DUPLICATE?</Badge>
        </div>
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">SongRow</h2>
        <div className="border border-rule">
          <SongRow
            href="#"
            number={14}
            title="Adon Olam"
            titleMatch={{ start: 0, end: 4 }}
            matchBadge="TITLE"
            metaLine="D♭ · 6/8 · Praise"
          />
          <SongRow
            href="#"
            number={7}
            title="EREDTONAL"
            snippet={{ before: "the ", hit: "lord", after: " reigns" }}
            metaLine="Key: G"
          />
        </div>
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">MetaGrid</h2>
        <MetaGrid
          fields={[
            { fieldId: "1", name: "Key", value: "D♭", isKey: true },
            { fieldId: "2", name: "Time", value: "6/8" },
            { fieldId: "3", name: "Genre", value: "Praise" },
            { fieldId: "4", name: "Notes", value: "Slow intro, full choir on verse 2" },
          ]}
        />
      </section>

      <section className="max-w-sm space-y-1 pb-4">
        <h2 className="type-section-label">
          LyricSection (repeat-collapse test: 2 choruses in, should render once + 1 collapsed row)
        </h2>
        <div className="px-5">
          {TEST_SECTIONS.map((s, i) => (
            <div key={i} className="py-3">
              <LyricSection {...s} />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">TopBar</h2>
        <div className="border border-rule">
          <TopBar title="Edit song" backHref="#" right={<span className="type-mono text-muted">No. 015</span>} />
        </div>
      </section>

      <section className="max-w-sm space-y-2">
        <h2 className="type-section-label">StickyFooterAction</h2>
        <div className="relative h-24 border border-rule">
          <StickyFooterAction>
            <Button variant="primary">Save song ✓</Button>
          </StickyFooterAction>
        </div>
      </section>

      <section className="max-w-sm space-y-2 pb-24">
        <h2 className="type-section-label">Toast</h2>
        <ToastDemo />
      </section>

      <DockedPlayer
        recordings={[{ id: "1", url: "", filename: "Adon Olam - live recording.mp3" }]}
      />

      <section className="space-y-1">
        <h2 className="type-section-label">Type scale</h2>
        <p className="type-heading">Screen heading</p>
        <p className="type-song-title">Song title</p>
        <p className="type-list-title">List title</p>
        <p className="type-lyrics">ካቦድ መዘምራን lyrics sample</p>
        <p className="type-body">Body text</p>
        <p className="type-meta">Meta text</p>
        <p className="type-mono">No. 014</p>
      </section>
    </div>
    </ToastProvider>
  );
}
