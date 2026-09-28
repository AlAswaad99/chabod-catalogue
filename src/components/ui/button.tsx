import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger" | "danger-confirm" | "icon";

interface SharedProps {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** 2.4 for Plus/Check on a gold (primary) background, per the icon spec — default 2. */
  iconStrokeWidth?: number;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

interface ButtonAsButton extends SharedProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: undefined;
}

interface ButtonAsLink extends SharedProps {
  href: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

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

function ButtonContent({
  variant,
  icon: Icon,
  iconStrokeWidth = 2,
  children,
}: Pick<SharedProps, "variant" | "icon" | "iconStrokeWidth" | "children">) {
  if (variant === "icon") {
    return Icon ? <Icon size={22} strokeWidth={iconStrokeWidth} aria-hidden /> : null;
  }
  return (
    <>
      {children && <span className="flex-1 text-left">{children}</span>}
      {Icon && <Icon size={20} strokeWidth={iconStrokeWidth} aria-hidden className="shrink-0" />}
    </>
  );
}

// Renders as a real <a> (via next/link) when `href` is given — e.g. the
// desktop rail's "Add song" is a navigation target styled as a primary
// button, not a click handler.
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    icon,
    iconStrokeWidth = 2,
    fullWidth = variant === "primary" || variant === "secondary" || variant === "danger" || variant === "danger-confirm",
    className,
    children,
  } = props;
  const widthClass = variant === "icon" ? "" : fullWidth ? "w-full" : "";
  const composedClassName = `${BASE} ${VARIANT_CLASSES[variant]} ${widthClass} ${className ?? ""}`;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={composedClassName} aria-label={props["aria-label"]}>
        <ButtonContent variant={variant} icon={icon} iconStrokeWidth={iconStrokeWidth}>
          {children}
        </ButtonContent>
      </Link>
    );
  }

  // Strip the styling-only props before spreading the rest onto the real
  // <button> — none of these are valid DOM attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _variant, icon: _icon, iconStrokeWidth: _isw, fullWidth: _fw, className: _cn, children: _children, ...rest } = props;

  return (
    <button className={composedClassName} {...rest}>
      <ButtonContent variant={variant} icon={icon} iconStrokeWidth={iconStrokeWidth}>
        {children}
      </ButtonContent>
    </button>
  );
}
