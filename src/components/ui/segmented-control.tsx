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

// A recessed track with the selected option raised on a paper "thumb".
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
      className={`gap-0.5 rounded-md bg-secondary p-0.5 ${grid ? "grid grid-cols-2" : "flex h-11"}`}
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
            className={`flex items-center justify-center rounded-[5px] px-3 text-[14px] transition-[background-color,box-shadow,color] ${
              grid ? "h-10" : "h-full flex-1"
            } ${
              selected
                ? "bg-card font-semibold text-foreground shadow-sm ring-1 ring-border"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
