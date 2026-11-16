"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

interface ToastContextValue {
  showToast: (message: string) => void;
}

// Toasts are for confirmations only ("Song saved", "Access removed") —
// validation errors go inline next to the field instead, per §5.
//
// Rendering, stacking, swipe-to-dismiss and timing are Sonner's (the <Toaster/>
// is mounted once in the root layout). This provider only keeps the app's
// existing `useToast().showToast(message)` call sites working unchanged.
const value: ToastContextValue = {
  showToast: (message) => {
    toast(message);
  },
};

const ToastContext = createContext<ToastContextValue>(value);

export function ToastProvider({ children }: { children: ReactNode }) {
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
