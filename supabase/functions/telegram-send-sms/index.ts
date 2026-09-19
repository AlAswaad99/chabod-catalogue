// Supabase Auth "Send SMS" hook target.
//
// GoTrue calls this instead of a real SMS provider whenever it needs to
// deliver a phone OTP. We look up the Telegram chat linked to that phone
// number (via the telegram-webhook function) and send the code there
// through the Telegram Bot API.
//
// Until TELEGRAM_BOT_TOKEN is configured, or if the phone has no linked
// Telegram chat yet, the OTP is logged to this function's console instead —
// lets the whole login flow be exercised locally before the bot exists.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Webhook } from "npm:standardwebhooks@1.0.0";

const SEND_SMS_HOOK_SECRET = Deno.env.get("send_sms_hook_secret") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("telegram_bot_token") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const rawBody = await req.text();

  if (SEND_SMS_HOOK_SECRET) {
    try {
      const wh = new Webhook(SEND_SMS_HOOK_SECRET.replace("v1,whsec_", ""));
      wh.verify(rawBody, Object.fromEntries(req.headers));
    } catch (err) {
      console.error("telegram-send-sms: signature verification failed", err);
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody) as {
    user: { phone: string };
    sms: { otp: string };
  };
  const phone = payload.user.phone;
  const otp = payload.sms.otp;

  const { data: link } = await supabase
    .from("telegram_links")
    .select("telegram_chat_id")
    .eq("phone_number", phone.startsWith("+") ? phone : `+${phone}`)
    .maybeSingle();

  if (!TELEGRAM_BOT_TOKEN || !link) {
    console.log(
      `[telegram-send-sms:DEV FALLBACK] OTP for ${phone} is ${otp}` +
        (TELEGRAM_BOT_TOKEN ? " (no linked Telegram chat yet)" : " (TELEGRAM_BOT_TOKEN not set)"),
    );
    return new Response(null, { status: 200 });
  }

  const message = `Your Chabod Choir Catalogue login code is: ${otp}`;
  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: link.telegram_chat_id, text: message }),
    },
  );

  if (!telegramResponse.ok) {
    const body = await telegramResponse.text();
    console.error("telegram-send-sms: Telegram API error", telegramResponse.status, body);
    return new Response(JSON.stringify({ error: "failed to deliver OTP via Telegram" }), { status: 500 });
  }

  return new Response(null, { status: 200 });
});
