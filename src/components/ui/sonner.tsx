"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { useTheme } from "@/lib/theme";

// shadcn's Sonner wrapper, pointed at the app's own theme hook (it ships
// wired to next-themes) and at the Hymnal tokens so toasts match the page.
const Toaster = ({ ...props }: ToasterProps) => {
  const [theme] = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--foreground)",
          "--normal-text": "var(--background)",
          "--normal-border": "var(--foreground)",
          "--border-radius": "var(--radius)",
          fontFamily: "var(--font-ui)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
