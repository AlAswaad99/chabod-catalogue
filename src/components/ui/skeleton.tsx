import type { HTMLAttributes } from "react";

// Placeholder block for loading states. Pulses via `animate-pulse`, which the
// global prefers-reduced-motion rule in globals.css already flattens.
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={`animate-pulse rounded-[var(--radius)] bg-rule/60 ${className}`} {...props} />;
}
