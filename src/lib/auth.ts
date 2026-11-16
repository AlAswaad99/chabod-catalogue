import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  /** Digits only, e.g. "251944194561" — same shape as auth.users.phone. */
  phone: string | null;
  isAdmin: boolean;
}

// The signed-in user for the current request, read from the verified JWT
// claims instead of an Auth-server round trip.
//
// Why: supabase.auth.getUser() is an HTTP call to Supabase Auth. The old
// code made it three times per navigation (proxy, layout, page), each one
// crossing from the Vercel function to the database region before any real
// data was fetched. getClaims() verifies the signature locally against the
// project's cached JWKS (and refreshes an expired session), so it costs
// ~nothing after the first request in a warm instance.
//
// React's cache() dedupes it per request, so layouts and pages can all call
// it freely.
//
// Trade-off: role changes show up when the access token next refreshes
// (≤ 1 hour) rather than instantly. Privileged mutations still re-check
// with getUser() (see requireAdmin) and the database enforces RLS regardless.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const appMetadata = (claims.app_metadata ?? {}) as { role?: string };
  return {
    id: claims.sub,
    phone: typeof claims.phone === "string" && claims.phone ? claims.phone : null,
    isAdmin: appMetadata.role === "admin",
  };
});
