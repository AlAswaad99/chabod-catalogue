import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const E164_RE = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  const { phone } = (await request.json()) as { phone?: string };

  if (!phone || !E164_RE.test(phone)) {
    return NextResponse.json(
      { status: "invalid", message: "Enter a phone number with country code, e.g. +15555550123." },
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

  return NextResponse.json({ status: "ready" });
}
