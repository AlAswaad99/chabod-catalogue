import { RecordingRow } from "@/components/ui/recording-row";

interface DetailField {
  fieldId: string;
  name: string;
  value: string;
}

// Desktop only (§4.10, 1200px+): DETAILS as plain label/value rows (not the
// phone MetaGrid tiles) and RECORDINGS as a list of independently playable
// rows, replacing the fixed DockedPlayer at this breakpoint entirely.
export function SongDesktopSidebar({
  fields,
  recordings,
}: {
  fields: DetailField[];
  recordings: { id: string; url: string; filename: string }[];
}) {
  if (fields.length === 0 && recordings.length === 0) return null;

  return (
    <aside className="hidden w-[300px] shrink-0 border-l-2 border-rule px-5 py-6 desktop:block">
      {fields.length > 0 && (
        <div className="space-y-0 pb-6">
          <p className="type-section-label pb-2">Details</p>
          {fields.map((f) => (
            <div key={f.fieldId} className="grid grid-cols-[96px_1fr] border-b border-rule py-2.5">
              <span className="type-field-label text-muted">{f.name}</span>
              <span className="type-body text-ink">{f.value}</span>
            </div>
          ))}
        </div>
      )}
      {recordings.length > 0 && (
        <div>
          <p className="type-section-label pb-2">Recordings</p>
          <div className="divide-y divide-rule">
            {recordings.map((r) => (
              <RecordingRow key={r.id} url={r.url} filename={r.filename} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
