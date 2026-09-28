import { X } from "lucide-react";

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export function Chip({ label, selected, onClick, onRemove }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 min-w-11 items-center gap-1.5 border px-3 text-sm ${
        selected ? "border-fill bg-fill font-bold text-on-fill" : "border-rule-2 bg-transparent font-medium text-ink"
      }`}
    >
      {label}
      {onRemove && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </span>
      )}
    </button>
  );
}
