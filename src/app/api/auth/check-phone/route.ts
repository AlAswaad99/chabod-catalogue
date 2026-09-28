import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// +251 only (redesign decisions.md Q2) — this app only ever serves Ethiopian
// phone numbers, matching PhoneInput's fixed +251 prefix and 9-digit field.
const E164_RE = /^\+251\d{9}$/;

// Keep in sync with supabase/config.toml's [auth.sms] max_frequency — there's
// no runtime way to read that value from GoTrue, so the login page's resend
// countdown is seeded from this instead of a guessed UI duration.
const RESEND_SECONDS = Number(process.env.SMS_OTP_RESEND_SECONDS) || 5;

export async function POST(request: Request) {
  const { phone } = (await request.json()) as { phone?: string };

  if (!phone || !E164_RE.test(phone)) {
    return NextResponse.json(
      { status: "invalid", message: "Enter a valid Ethiopian phone number, e.g. +251912345678." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: allowed } = await supabase
    .from("allowed_users")
    .select("phone_number")
    .eq("phone_number", phone)
    .maybeSingle();

  if (!allowed) {
    return NextResponse.json({
      status: "not_allowed",
      message: "This phone number isn't on the choir's member list. Ask an admin to add you.",
    });
  }

  const { data: link } = await supabase
    .from("telegram_links")
    .select("phone_number")
    .eq("phone_number", phone)
    .maybeSingle();

  if (!link) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || null;
    return NextResponse.json({
      status: "needs_link",
      botUsername,
      botDeepLink: botUsername ? `https://t.me/${botUsername}?start=link` : null,
    });
  }

  return NextResponse.json({ status: "ready", resendSeconds: RESEND_SECONDS });
}
