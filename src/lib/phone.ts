// Mirrors public.normalize_phone() in
// supabase/migrations/20260919130000_fix_phone_normalization.sql: GoTrue's
// session.user.phone has no leading "+" (e.g. "251911000001"), while
// allowed_users.phone_number is stored with one (e.g. "+251911000001").
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.startsWith("+") ? phone : `+${phone}`;
}
