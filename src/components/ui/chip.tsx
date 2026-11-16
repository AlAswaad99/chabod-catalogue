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
      aria-pressed={onClick ? !!selected : undefined}
      className={`inline-flex h-10 min-w-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors ${
        selected
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : "border-input bg-card font-medium text-ink hover:bg-secondary"
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
