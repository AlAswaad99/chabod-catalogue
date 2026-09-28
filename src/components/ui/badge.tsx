import type { ReactNode } from "react";

export type BadgeVariant = "match" | "role-admin" | "role-member" | "warn";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  match: "text-label",
  "role-admin": "bg-fill px-2 py-0.5 text-on-fill",
  "role-member": "border border-rule-2 px-2 py-0.5 text-muted",
  warn: "border border-label px-2 py-0.5 text-label",
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return <span className={`type-badge inline-block ${VARIANT_CLASSES[variant]}`}>{children}</span>;
}
