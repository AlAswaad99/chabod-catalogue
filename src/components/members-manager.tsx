"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addMember, removeMember, updateMemberRole } from "@/lib/actions/members";
import { TopBar } from "@/components/ui/top-bar";
import { PhoneInput } from "@/components/ui/phone-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AllowedUser, MemberRole } from "@/types/song";

type MemberRow = AllowedUser & { telegramLinked: boolean };

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

function formatPhone(phone: string): string {
  const digits = phone.replace("+251", "");
  if (digits.length !== 9) return phone;
  return `+251 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

export function MembersManager({
  initialMembers,
  currentUserPhone,
}: {
  initialMembers: MemberRow[];
  currentUserPhone: string | null;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [newRole, setNewRole] = useState<MemberRole>("member");
  const [addError, setAddError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const adminCount = members.filter((m) => m.role === "admin").length;
  const notLinkedCount = members.filter((m) => !m.telegramLinked).length;

  function openAddForm() {
    setShowAddForm(true);
    setPhoneDigits("");
    setNewRole("member");
    setAddError(null);
  }

  function handleAdd() {
    const fullPhone = `+251${phoneDigits}`;
    if (phoneDigits.length !== 9) {
      setAddError("Enter a 9-digit Ethiopian number.");
      return;
    }
    if (members.some((m) => m.phone_number === fullPhone)) {
      setAddError("This number is already on the list.");
      return;
    }
    setAddError(null);
    startTransition(async () => {
      const { error: addErr } = await addMember({ phoneNumber: fullPhone, role: newRole });
      if (addErr) {
        setAddError(addErr);
        return;
      }
      setMembers((prev) => [
        {
          id: crypto.randomUUID(),
          phone_number: fullPhone,
          role: newRole,
          display_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          telegramLinked: false,
        },
        ...prev,
      ]);
      setShowAddForm(false);
    });
  }

  function handleRoleChange(id: string, role: MemberRole) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    startTransition(async () => {
      const { error: err } = await updateMemberRole(id, role);
      if (err) setError(err);
    });
  }

  function handleRemoveClick(id: string) {
    if (confirmingRemoveId !== id) {
      setConfirmingRemoveId(id);
      return;
    }
    setConfirmingRemoveId(null);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      const { error: err } = await removeMember(id);
      if (err) setError(err);
    });
  }

  return (
    <div>
      <TopBar
        title="Members"
        right={
          !showAddForm && (
            <Button variant="text" icon={Plus} onClick={openAddForm}>
              Add member
            </Button>
          )
        }
      />

      <div className="px-5 py-4">
        {showAddForm && (
          <div className="mb-4 space-y-3 border-2 border-fill p-4">
            <PhoneInput value={phoneDigits} onChange={setPhoneDigits} label="Phone number" autoFocus />
            <div className="space-y-1">
              <p className="type-field-label text-muted">Role</p>
              <SegmentedControl aria-label="Role" value={newRole} onChange={setNewRole} options={ROLE_OPTIONS} />
            </div>
            <p className="type-meta">They&apos;ll link Telegram the first time they sign in.</p>
            {addError && <p className="type-meta text-danger">{addError}</p>}
            <div className="flex items-center gap-2">
              <Button onClick={handleAdd} disabled={isPending} fullWidth={false} className="h-10 px-4">
                Give access
              </Button>
              <Button variant="text" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <p className="type-meta border-b-2 border-rule pb-2">
          {members.length} {members.length === 1 ? "number" : "numbers"} · {adminCount}{" "}
          {adminCount === 1 ? "admin" : "admins"} · {notLinkedCount} not linked
        </p>

        {error && <p className="type-body pt-2 text-danger">{error}</p>}

        <div className="divide-y divide-rule">
          {members.map((m) => {
            const isSelf = currentUserPhone !== null && m.phone_number === currentUserPhone;
            const isLastAdmin = m.role === "admin" && adminCount === 1;
            const locked = isSelf || isLastAdmin;
            const expanded = expandedId === m.id;

            return (
              <div key={m.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : m.id)}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[16px] font-semibold text-ink">
                      {formatPhone(m.phone_number)}
                      {isSelf && <span className="text-muted"> · You</span>}
                    </p>
                    <p className={`type-meta ${m.telegramLinked ? "text-label" : "text-muted"}`}>
                      {m.telegramLinked ? "✓ Telegram linked" : "○ Not linked yet"}
                    </p>
                  </div>
                  <Badge variant={m.role === "admin" ? "role-admin" : "role-member"}>
                    {m.role === "admin" ? "Admin" : "Member"}
                  </Badge>
                </button>

                {expanded && (
                  <div className="space-y-3 bg-surface p-4">
                    {locked ? (
                      <p className="type-body text-muted">
                        {isSelf
                          ? "You can't change your own access. Ask another admin to do it."
                          : "This is the last admin — add another admin before removing this one."}
                      </p>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <p className="type-field-label text-muted">Role</p>
                          <SegmentedControl
                            aria-label="Role"
                            value={m.role}
                            onChange={(role) => handleRoleChange(m.id, role)}
                            options={ROLE_OPTIONS}
                          />
                        </div>
                        <Button
                          type="button"
                          variant={confirmingRemoveId === m.id ? "danger-confirm" : "danger"}
                          onClick={() => handleRemoveClick(m.id)}
                        >
                          {confirmingRemoveId === m.id
                            ? `Tap again to remove ${formatPhone(m.phone_number)}`
                            : "Remove access"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
