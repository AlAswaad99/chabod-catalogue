"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { OtpInput } from "@/components/ui/otp-input";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";

type Step =
  | { name: "phone" }
  | { name: "needs_link"; botDeepLink: string | null; message?: string }
  | { name: "otp"; resendSeconds: number }
  | { name: "error"; message: string };

// Login has no rail/nav chrome of its own, so each step centers its content
// into a form-width column at the desktop breakpoint instead of stretching
// a single phone-number field across the full viewport (§4.10's "admin form
// screens stay single-column, centered" convention, narrowed for a login form).
const DESKTOP_COLUMN = "desktop:mx-auto desktop:w-full desktop:max-w-[440px]";

const LINK_STEPS = [
  "Open @ChabodBot and tap Start.",
  'Tap "Share my phone number" when it asks.',
  "Come back here and continue.",
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>({ name: "phone" });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const fullPhone = `+251${phoneDigits}`;

  useEffect(() => {
    if (step.name !== "otp") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step.name]);

  async function checkPhoneAndProceed() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();

      if (data.status === "invalid" || data.status === "not_allowed") {
        setStep({ name: "error", message: data.message });
        return;
      }

      if (data.status === "needs_link") {
        // Re-checking from the needs_link step itself (still unlinked) shows
        // an inline message on that same step rather than bouncing to a
        // separate error screen.
        setStep((prev) => ({
          name: "needs_link",
          botDeepLink: data.botDeepLink,
          message:
            prev.name === "needs_link"
              ? "Still not linked. Finish the steps in Telegram, then try again."
              : undefined,
        }));
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        setStep({ name: "error", message: error.message });
        return;
      }
      setSecondsLeft(data.resendSeconds ?? 5);
      setOtp("");
      setOtpError(null);
      setStep({ name: "otp", resendSeconds: data.resendSeconds ?? 5 });
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(code: string) {
    setBusy(true);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: code, type: "sms" });
      if (error) {
        setOtpError(error.message);
        return;
      }
      router.push("/catalogue");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      {step.name === "phone" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            checkPhoneAndProceed();
          }}
          className="flex flex-1 flex-col"
        >
          <div className={`flex-1 space-y-6 px-4 pt-12 ${DESKTOP_COLUMN}`}>
            <div className="space-y-1">
              <Wordmark size={56} />
              <p className="type-section-label">Chabod Choir · Song catalogue</p>
            </div>
            <div className="border-t-2 border-rule" />
            <PhoneInput
              value={phoneDigits}
              onChange={setPhoneDigits}
              label="Phone number"
              autoFocus
            />
            <p className="type-meta">
              We&apos;ll send a one-time code through <strong className="text-ink">@ChabodBot</strong> on
              Telegram.
            </p>
          </div>
          <StickyFooterAction>
            <div className={DESKTOP_COLUMN}>
              <Button type="submit" icon={ArrowRight} disabled={busy || phoneDigits.length !== 9}>
                {busy ? "Checking…" : "Send code"}
              </Button>
            </div>
          </StickyFooterAction>
        </form>
      )}

      {step.name === "needs_link" && (
        <div className={`flex flex-1 flex-col px-4 pt-6 ${DESKTOP_COLUMN}`}>
          <div className="flex items-center gap-3">
            <Button
              variant="icon"
              icon={ArrowLeft}
              aria-label="Back"
              onClick={() => setStep({ name: "phone" })}
            />
            <Wordmark size={22} />
          </div>

          <div className="mt-8 flex-1 space-y-4">
            <p className="type-section-label text-label">One-time setup</p>
            <h1 className="type-heading text-ink">Link your phone to our Telegram bot</h1>
            <p className="type-body text-muted">
              Login codes come through Telegram, not SMS. You only do this once.
            </p>

            <ol className="mt-2 divide-y divide-rule border-y border-rule">
              {LINK_STEPS.map((text, i) => (
                <li key={text} className="flex items-start gap-4 py-4">
                  <span className="type-mono text-accent">{i + 1}</span>
                  <span className="type-body text-ink">{text}</span>
                </li>
              ))}
            </ol>

            {step.message && <p className="type-body text-danger">{step.message}</p>}
          </div>

          <div className="space-y-3 py-6">
            <Button
              variant="primary"
              icon={Send}
              disabled={!step.botDeepLink}
              onClick={() => {
                if (step.botDeepLink) window.open(step.botDeepLink, "_blank", "noopener,noreferrer");
              }}
            >
              Open @ChabodBot
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => checkPhoneAndProceed()}>
              {busy ? "Checking…" : "I've linked it, continue"}
            </Button>
          </div>
        </div>
      )}

      {step.name === "otp" && (
        <div className={`flex flex-1 flex-col px-4 pt-12 ${DESKTOP_COLUMN}`}>
          <div className="flex-1 space-y-4">
            <p className="type-mono text-muted">Last step</p>
            <h1 className="type-heading text-ink">Enter the code</h1>
            <p className="type-body text-muted">
              We sent a code to +251 {phoneDigits}
            </p>

            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setOtpError(null);
              }}
              onComplete={verifyOtp}
              autoFocus
              disabled={busy}
            />
            {otpError && <p className="type-meta text-danger">{otpError}</p>}

            <div className="flex items-center justify-between pt-2">
              {secondsLeft > 0 ? (
                <p className="type-body text-muted">
                  Resend in 0:{String(secondsLeft).padStart(2, "0")}
                </p>
              ) : (
                <Button variant="text" disabled={busy} onClick={() => checkPhoneAndProceed()}>
                  Resend
                </Button>
              )}
              <Button variant="text" onClick={() => setStep({ name: "phone" })}>
                Change number
              </Button>
            </div>
          </div>
        </div>
      )}

      {step.name === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="type-body text-danger">{step.message}</p>
          <div className={DESKTOP_COLUMN}>
            <Button variant="secondary" onClick={() => setStep({ name: "phone" })}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
