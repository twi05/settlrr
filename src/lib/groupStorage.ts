import type { Group, Member, Transaction } from "@/types";

export type GroupBundle = {
  group: Group;
  members: Member[];
  transactions: Transaction[];
};

const storageKey = (id: string) => `split_app_group_${id}`;

export function loadGroupBundle(groupId: string): GroupBundle | null {
  try {
    const raw = localStorage.getItem(storageKey(groupId));
    if (!raw) return null;
    const data = JSON.parse(raw) as GroupBundle;
    if (!data?.group?.id || data.group.id !== groupId) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGroupBundle(bundle: GroupBundle): void {
  localStorage.setItem(storageKey(bundle.group.id), JSON.stringify(bundle));
}
