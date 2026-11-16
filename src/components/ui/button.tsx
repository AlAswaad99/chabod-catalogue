import Link from "next/link";
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// One Button for the whole app. It speaks two dialects on purpose:
//   • the app's own variants — primary / secondary / text / danger /
//     danger-confirm / icon — with an `icon` prop and optional `href`, used by
//     the screens; and
//   • shadcn's — default / outline / ghost / destructive / link and its sizes —
//     which the registry components (dialog, command, input-group…) expect.
// It stays a plain element (no "use client") so server components can pass it
// an `icon` component without crossing a serialisation boundary.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "text"
  | "danger"
  | "danger-confirm"
  | "icon"
  | "default"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const LEGACY: ReadonlySet<ButtonVariant> = new Set(["primary", "secondary", "text", "danger", "danger-confirm", "icon"]);

const buttonVariants = cva(
  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // — the app's dialect —
        primary:
          "h-12 justify-between bg-primary px-4 type-action text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "h-12 justify-between border border-input bg-card px-4 text-[15px] font-medium text-foreground hover:bg-secondary",
        text: "h-11 bg-transparent px-0 text-sm font-semibold text-brand underline-offset-4 hover:underline",
        danger:
          "h-12 justify-between border border-destructive/60 bg-transparent px-4 text-[15px] font-medium text-destructive hover:bg-destructive/10",
        "danger-confirm":
          "h-12 justify-between bg-destructive px-4 text-[15px] font-semibold text-background hover:bg-destructive/90",
        icon: "h-11 w-11 justify-center bg-transparent text-foreground hover:bg-secondary",
        // — shadcn's dialect —
        default: "justify-center bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "justify-center border border-input bg-card hover:bg-secondary",
        ghost: "justify-center hover:bg-secondary hover:text-foreground",
        destructive: "justify-center bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "justify-center text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-4",
        icon: "size-9 justify-center p-0",
        "icon-xs": "size-6 justify-center p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 justify-center p-0",
        "icon-lg": "size-11 justify-center p-0",
      },
    },
  },
);

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** 2.4 for Plus/Check on a filled (primary) background — default 2. */
  iconStrokeWidth?: number;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

interface ButtonAsButton
  extends SharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: undefined;
}

interface ButtonAsLink extends SharedProps {
  href: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

function ButtonContent({
  variant,
  icon: Icon,
  iconStrokeWidth = 2,
  children,
}: Pick<SharedProps, "variant" | "icon" | "iconStrokeWidth" | "children">) {
  if (variant === "icon") {
    return Icon ? <Icon size={22} strokeWidth={iconStrokeWidth} aria-hidden /> : null;
  }
  if (!Icon) return <>{children}</>;
  return (
    <>
      {children && <span className="flex-1 text-left">{children}</span>}
      <Icon size={20} strokeWidth={iconStrokeWidth} aria-hidden className="shrink-0" />
    </>
  );
}

// Renders as a real <a> (via next/link) when `href` is given — e.g. the
// desktop rail's "Add song" is a navigation target styled as a primary
// button, not a click handler.
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size,
    icon,
    iconStrokeWidth = 2,
    fullWidth = variant === "primary" || variant === "secondary" || variant === "danger" || variant === "danger-confirm",
    className,
    children,
  } = props;

  const resolvedSize = size ?? (LEGACY.has(variant) ? undefined : "default");
  const composedClassName = cn(
    buttonVariants({ variant, size: resolvedSize }),
    fullWidth && variant !== "icon" && "w-full",
    className,
  );

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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    variant: _v,
    size: _s,
    icon: _i,
    iconStrokeWidth: _isw,
    fullWidth: _fw,
    className: _cn,
    children: _children,
    ...rest
  } = props;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <button data-slot="button" className={composedClassName} {...rest}>
      <ButtonContent variant={variant} icon={icon} iconStrokeWidth={iconStrokeWidth}>
        {children}
      </ButtonContent>
    </button>
  );
}

export { buttonVariants };
