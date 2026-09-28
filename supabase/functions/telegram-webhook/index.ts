// Receives updates from the Telegram Bot API (configured via setWebhook,
// see docs/telegram-bot-setup.md once the bot exists). Handles two cases:
//
// 1. /start — greets the user and asks them to share their phone number
//    via Telegram's native "request contact" button (proves they own the
//    Telegram account associated with that number).
// 2. A shared contact — links phone_number -> telegram_chat_id in
//    telegram_links, but only if that phone is on the choir's allowlist.
import { createClient } from "jsr:@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("telegram_bot_token") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("telegram_webhook_secret") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function normalizePhone(raw: string): string {
  return raw.startsWith("+") ? raw : `+${raw}`;
}

async function sendMessage(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[telegram-webhook:DEV] would send to ${chatId}: ${text}`);
    return;
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

Deno.serve(async (req) => {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const token = req.headers.get("x-telegram-bot-api-secret-token");
    if (token !== TELEGRAM_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const update = await req.json();
  const message = update.message;

  if (!message) {
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const chatId = message.chat.id as number;

  if (message.contact) {
    const phone = normalizePhone(message.contact.phone_number);

    const { data: allowed } = await supabase
      .from("allowed_users")
      .select("phone_number")
      .eq("phone_number", phone)
      .maybeSingle();

    if (!allowed) {
      await sendMessage(
        chatId,
        `${phone} isn't on the choir's member list yet. Ask an admin to add you, then try again.`,
      );
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    await supabase.from("telegram_links").upsert({
      phone_number: phone,
      telegram_chat_id: chatId,
      telegram_username: message.from?.username ?? null,
    });

    await sendMessage(
      chatId,
      "Phone number linked! Go back to the catalogue and request your login code — it'll show up right here.",
      { reply_markup: { remove_keyboard: true } },
    );
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (typeof message.text === "string" && message.text.startsWith("/start")) {
    await sendMessage(
      chatId,
      "Welcome to the Chabod Choir Catalogue bot! Tap the button below to link your phone number so login codes can be sent here.",
      {
        reply_markup: {
          keyboard: [[{ text: "Share my phone number", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
