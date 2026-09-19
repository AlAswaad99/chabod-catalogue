import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// For use in Server Components, Route Handlers, and Server Actions. Reads
// the session from cookies and enforces RLS as that user (never bypasses
// it) — use lib/supabase/admin.ts for the rare cases that need to.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies — fine,
            // middleware.ts already refreshes the session on every request.
          }
        },
      },
    },
  );
}
