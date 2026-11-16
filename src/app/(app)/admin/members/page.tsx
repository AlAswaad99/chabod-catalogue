import { getSessionUser } from "@/lib/auth";
import { listMembersWithLinkStatus } from "@/lib/actions/members";
import { normalizePhone } from "@/lib/phone";
import { MembersManager } from "@/components/members-manager";

export default async function MembersPage() {
  const [members, user] = await Promise.all([listMembersWithLinkStatus(), getSessionUser()]);

  return (
    <MembersManager initialMembers={members} currentUserPhone={normalizePhone(user?.phone ?? null)} />
  );
}
