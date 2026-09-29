import { createClient } from "@/lib/supabase/server";
import { listMembersWithLinkStatus } from "@/lib/actions/members";
import { normalizePhone } from "@/lib/phone";
import { MembersManager } from "@/components/members-manager";

export default async function MembersPage() {
  const supabase = await createClient();
  const [members, {
    data: { user },
  }] = await Promise.all([listMembersWithLinkStatus(), supabase.auth.getUser()]);

  return (
    <MembersManager initialMembers={members} currentUserPhone={normalizePhone(user?.phone ?? null)} />
  );
}
