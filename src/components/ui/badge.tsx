import type { ReactNode } from "react";

export type BadgeVariant = "match" | "role-admin" | "role-member" | "warn";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  match: "text-label",
  "role-admin": "rounded-sm bg-primary px-2 py-0.5 text-primary-foreground",
  "role-member": "rounded-sm border border-input px-2 py-0.5 text-muted-foreground",
  warn: "rounded-sm border border-label px-2 py-0.5 text-label",
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return <span className={`type-badge inline-block ${VARIANT_CLASSES[variant]}`}>{children}</span>;
}
