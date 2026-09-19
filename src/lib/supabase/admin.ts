import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Bypasses RLS with the service role key. Only for the small set of
// server-only operations that must run before a user has a session at all
// (e.g. checking phone-allowlist / Telegram-link status during login).
// Never import this from a Client Component or expose its result directly.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
