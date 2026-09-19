import { listMembersWithLinkStatus } from "@/lib/actions/members";
import { MembersManager } from "@/components/members-manager";

export default async function MembersPage() {
  const members = await listMembersWithLinkStatus();
  return <MembersManager initialMembers={members} />;
}
