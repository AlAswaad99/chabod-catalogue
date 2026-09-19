"use client";

import { useState, useTransition } from "react";
import { addMember, removeMember, updateMemberRole } from "@/lib/actions/members";
import type { AllowedUser, MemberRole } from "@/types/song";

type MemberRow = AllowedUser & { telegramLinked: boolean };

export function MembersManager({ initialMembers }: { initialMembers: MemberRow[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await addMember({ phoneNumber, role, displayName });
      if (error) {
        setError(error);
        return;
      }
      setMembers((prev) => [
        { id: crypto.randomUUID(), phone_number: phoneNumber, role, display_name: displayName || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), telegramLinked: false },
        ...prev,
      ]);
      setPhoneNumber("");
      setDisplayName("");
      setRole("member");
    });
  }

  function handleRoleChange(id: string, newRole: MemberRole) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    startTransition(async () => {
      const { error } = await updateMemberRole(id, newRole);
      if (error) setError(error);
    });
  }

  function handleRemove(id: string) {
    if (!window.confirm("Remove this member? They'll lose access immediately on next token refresh.")) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      const { error } = await removeMember(id);
      if (error) setError(error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Members</h1>

      <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-foreground/10 p-3">
        <input
          placeholder="Phone number, e.g. +15555550123"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
          className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium disabled:opacity-50"
        >
          Add member
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg border border-foreground/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{m.display_name || m.phone_number}</p>
                <p className="text-xs text-foreground/50">{m.phone_number}</p>
              </div>
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  m.telegramLinked ? "bg-green-600/10 text-green-700" : "bg-amber-600/10 text-amber-700"
                }`}
              >
                {m.telegramLinked ? "Telegram linked" : "Not linked yet"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
                className="rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="text-sm text-red-600"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
