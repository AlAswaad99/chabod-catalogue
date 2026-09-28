export interface MetaGridField {
  fieldId: string;
  name: string;
  value: string;
  /** The Key field always gets the special 20/800 accent treatment (§3.11). */
  isKey?: boolean;
}

// First 3 fields render in the grid (4 columns at desktop width — the
// brief's tablet-only 4-column step is promoted to our desktop breakpoint
// since tablet itself is deferred, see docs/redesign/decisions.md Q10).
// Anything beyond that renders as full-width label/value rows.
export function MetaGrid({ fields }: { fields: MetaGridField[] }) {
  const gridFields = fields.slice(0, 3);
  const rowFields = fields.slice(3);

  return (
    <div>
      {gridFields.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-rule bg-rule desktop:grid-cols-4">
          {gridFields.map((f) => (
            <div key={f.fieldId} className="space-y-0.5 bg-ground p-3">
              <p className="type-field-label text-muted">{f.name}</p>
              <p className={f.isKey ? "text-[20px] font-extrabold text-accent" : "text-[17px] font-bold text-ink"}>
                {f.value}
              </p>
            </div>
          ))}
        </div>
      )}
      {rowFields.map((f) => (
        <div key={f.fieldId} className="grid grid-cols-[96px_1fr] border-b border-rule py-2.5">
          <span className="type-field-label text-muted">{f.name}</span>
          <span className="type-body text-ink">{f.value}</span>
        </div>
      ))}
    </div>
  );
}
