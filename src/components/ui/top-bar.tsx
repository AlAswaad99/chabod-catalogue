import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
  /** Song detail wants no bottom rule (§4.3) — every other screen keeps it. */
  noBorder?: boolean;
}

export function TopBar({ title, backHref, onBack, onClose, right, noBorder }: TopBarProps) {
  const leadingIconClass = "-ml-2 flex h-11 w-11 items-center justify-center text-ink";

  return (
    <header
      className={`flex h-[60px] items-center gap-2 px-4 ${noBorder ? "" : "border-b-2 border-rule"}`}
    >
      {backHref ? (
        <Link href={backHref} aria-label="Back" className={leadingIconClass}>
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className={leadingIconClass}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
      ) : onClose ? (
        <button type="button" onClick={onClose} aria-label="Close" className={leadingIconClass}>
          <X size={22} strokeWidth={2} />
        </button>
      ) : null}
      <h1 className="type-topbar-title min-w-0 flex-1 truncate text-ink">{title}</h1>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
