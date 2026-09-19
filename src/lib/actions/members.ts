"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AllowedUser, MemberRole } from "@/types/song";

const E164_RE = /^\+[1-9]\d{7,14}$/;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.app_metadata?.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return supabase;
}

export async function addMember(input: {
  phoneNumber: string;
  role: MemberRole;
  displayName?: string;
}): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  if (!E164_RE.test(input.phoneNumber)) {
    return { error: "Phone number must be in E.164 format, e.g. +15555550123." };
  }

  const { error } = await supabase.from("allowed_users").insert({
    phone_number: input.phoneNumber,
    role: input.role,
    display_name: input.displayName || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/members");
  return { error: null };
}

export async function updateMemberRole(id: string, role: MemberRole): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("allowed_users").update({ role }).eq("id", id);
  if (!error) revalidatePath("/admin/members");
  return { error: error?.message ?? null };
}

export async function removeMember(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("allowed_users").delete().eq("id", id);
  if (!error) revalidatePath("/admin/members");
  return { error: error?.message ?? null };
}

// telegram_links has no RLS policies for regular users (service_role only),
// so link status is read here with the admin client — gated by the same
// requireAdmin() check as every other member-management action above.
export async function listMembersWithLinkStatus(): Promise<
  (AllowedUser & { telegramLinked: boolean })[]
> {
  const supabase = await requireAdmin();
  const admin = createAdminClient();

  const { data: members } = await supabase
    .from("allowed_users")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: links } = await admin.from("telegram_links").select("phone_number");
  const linkedPhones = new Set((links ?? []).map((l) => l.phone_number));

  return ((members ?? []) as unknown as AllowedUser[]).map((m) => ({
    ...m,
    telegramLinked: linkedPhones.has(m.phone_number),
  }));
}
