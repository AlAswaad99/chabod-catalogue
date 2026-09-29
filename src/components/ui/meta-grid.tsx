export interface MetaGridField {
  fieldId: string;
  name: string;
  value: string;
  /** The Key value is always 20/800 accent, per §3.11. */
  isKey?: boolean;
}

function Cell({ f }: { f: MetaGridField }) {
  return (
    <div className="space-y-0.5 bg-ground p-3">
      <p className="type-field-label text-muted">{f.name}</p>
      <p className={f.isKey ? "text-[20px] font-extrabold text-accent" : "text-[17px] font-bold text-ink"}>
        {f.value}
      </p>
    </div>
  );
}

function Row({ f }: { f: MetaGridField }) {
  return (
    <div className="grid grid-cols-[96px_1fr] border-b border-rule py-2.5">
      <span className="type-field-label text-muted">{f.name}</span>
      <span className="type-body text-ink">{f.value}</span>
    </div>
  );
}

// 3 columns on phone, 4 on tablet+ (§3.11) — a genuinely different field
// count per breakpoint, not just a wider grid, so two variants are rendered
// and toggled with hidden/tablet: rather than picking one slice server-side
// (there's no viewport info at render time). Anything past the grid at a
// given breakpoint renders as a full-width label/value row instead.
export function MetaGrid({ fields }: { fields: MetaGridField[] }) {
  const phoneGrid = fields.slice(0, 3);
  const phoneRows = fields.slice(3);
  const tabletGrid = fields.slice(0, 4);
  const tabletRows = fields.slice(4);

  return (
    <div>
      {phoneGrid.length > 0 && (
        <div className="grid grid-cols-3 gap-px border border-rule bg-rule tablet:hidden">
          {phoneGrid.map((f) => (
            <Cell key={f.fieldId} f={f} />
          ))}
        </div>
      )}
      {tabletGrid.length > 0 && (
        <div className="hidden gap-px border border-rule bg-rule tablet:grid tablet:grid-cols-4">
          {tabletGrid.map((f) => (
            <Cell key={f.fieldId} f={f} />
          ))}
        </div>
      )}
      <div className="tablet:hidden">
        {phoneRows.map((f) => (
          <Row key={f.fieldId} f={f} />
        ))}
      </div>
      <div className="hidden tablet:block">
        {tabletRows.map((f) => (
          <Row key={f.fieldId} f={f} />
        ))}
      </div>
    </div>
  );
}
