import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger" | "danger-confirm" | "icon";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** 2.4 for Plus/Check on a gold (primary) background, per the icon spec — default 2. */
  iconStrokeWidth?: number;
  fullWidth?: boolean;
  children?: ReactNode;
  "aria-label"?: string;
}

const BASE =
  "inline-flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed transition-colors";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "h-14 justify-between bg-fill px-4 type-action text-on-fill hover:[background-color:color-mix(in_srgb,var(--fill)_88%,black)]",
  secondary:
    "h-14 justify-between border-2 border-rule-2 bg-transparent px-4 text-[15px] font-semibold text-ink hover:border-fill",
  text: "h-11 bg-transparent px-0 text-sm font-semibold text-accent",
  danger:
    "h-14 justify-between border-2 border-danger bg-transparent px-4 text-[15px] font-semibold text-danger",
  "danger-confirm": "h-14 justify-between bg-danger px-4 text-[15px] font-semibold text-ground",
  icon: "h-11 w-11 items-center justify-center bg-transparent text-ink",
};

export function Button({
  variant = "primary",
  icon: Icon,
  iconStrokeWidth = 2,
  fullWidth = variant === "primary" || variant === "secondary" || variant === "danger" || variant === "danger-confirm",
  className,
  children,
  ...props
}: ButtonProps) {
  const widthClass = variant === "icon" ? "" : fullWidth ? "w-full" : "";

  return (
    <button
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${widthClass} ${className ?? ""}`}
      {...props}
    >
      {variant === "icon" ? (
        Icon && <Icon size={22} strokeWidth={iconStrokeWidth} aria-hidden />
      ) : (
        <>
          {children && <span className="flex-1 text-left">{children}</span>}
          {Icon && <Icon size={20} strokeWidth={iconStrokeWidth} aria-hidden className="shrink-0" />}
        </>
      )}
    </button>
  );
}
