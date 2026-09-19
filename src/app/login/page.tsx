"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step =
  | { name: "phone" }
  | { name: "needs_link"; botDeepLink: string | null }
  | { name: "otp" }
  | { name: "error"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>({ name: "phone" });
  const [busy, setBusy] = useState(false);

  async function checkPhoneAndProceed(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.status === "invalid" || data.status === "not_allowed") {
        setStep({ name: "error", message: data.message });
        return;
      }

      if (data.status === "needs_link") {
        setStep({ name: "needs_link", botDeepLink: data.botDeepLink });
        return;
      }

      // status === "ready"
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setStep({ name: "error", message: error.message });
        return;
      }
      setStep({ name: "otp" });
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) {
        setStep({ name: "error", message: error.message });
        return;
      }
      router.push("/catalogue");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Chabod Choir Catalogue</h1>
          <p className="text-sm text-foreground/60">Sign in with your phone number</p>
        </div>

        {step.name === "phone" && (
          <form onSubmit={checkPhoneAndProceed} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="+15555550123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/50"
              />
              <p className="text-xs text-foreground/50">Include your country code, e.g. +1 for the US.</p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-foreground text-background py-3 font-medium disabled:opacity-50"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>
        )}

        {step.name === "needs_link" && (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              First, link your phone number to our Telegram bot — that&apos;s where your login codes
              will be sent.
            </p>
            {step.botDeepLink ? (
              <a
                href={step.botDeepLink}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg bg-foreground text-background py-3 font-medium"
              >
                Open Telegram bot
              </a>
            ) : (
              <p className="text-sm text-amber-600">
                The Telegram bot isn&apos;t configured yet — ask your admin.
              </p>
            )}
            <ol className="text-left text-sm text-foreground/70 list-decimal list-inside space-y-1">
              <li>Open the bot and tap Start.</li>
              <li>Tap &ldquo;Share my phone number&rdquo; when it asks.</li>
              <li>Come back here and continue.</li>
            </ol>
            <button
              onClick={() => checkPhoneAndProceed()}
              disabled={busy}
              className="w-full rounded-lg border border-foreground/20 py-3 font-medium disabled:opacity-50"
            >
              {busy ? "Checking…" : "I've linked it — continue"}
            </button>
            <button
              onClick={() => setStep({ name: "phone" })}
              className="text-sm text-foreground/50 underline"
            >
              Use a different number
            </button>
          </div>
        )}

        {step.name === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="otp" className="block text-sm font-medium">
                Enter the code sent to your Telegram
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-foreground/50"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-foreground text-background py-3 font-medium disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => setStep({ name: "phone" })}
              className="w-full text-sm text-foreground/50 underline"
            >
              Use a different number
            </button>
          </form>
        )}

        {step.name === "error" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600">{step.message}</p>
            <button
              onClick={() => setStep({ name: "phone" })}
              className="w-full rounded-lg border border-foreground/20 py-3 font-medium"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
