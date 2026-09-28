interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 2x2 grid variant, used for the metadata field type picker. */
  grid?: boolean;
  "aria-label": string;
}

// The gap:1px + background:rule / cell-background trick from §2.3 draws
// 1px dividers between cells without doubled borders.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  grid,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`gap-px border border-rule-2 bg-rule ${grid ? "grid grid-cols-2" : "flex h-11"}`}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center px-3 text-[15px] font-semibold ${grid ? "h-11" : "h-full flex-1"} ${
              selected ? "bg-fill text-on-fill" : "bg-surface text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
