import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import {
  setGroup,
  setMembers,
  setTransactions,
} from "@/store/slices/groupSlices";
import { saveGroupBundle } from "@/lib/groupStorage";

const inputClass =
  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const btnPrimary =
  "inline-flex h-10 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

function generateGroupId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;

    const newGroup = {
      id: generateGroupId(),
      name,
      createdAt: Date.now(),
    };

    dispatch(setGroup(newGroup));
    dispatch(setMembers([]));
    dispatch(setTransactions([]));
    saveGroupBundle({ group: newGroup, members: [], transactions: [] });

    navigate(`/g/${newGroup.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm">
        <div className="flex flex-col space-y-1.5 p-4">
          <h1 className="text-xl font-semibold leading-none tracking-tight text-gray-800">
            New group
          </h1>
          <p className="text-sm text-gray-600">
            Name your trip or household. You&apos;ll get a link to share.
          </p>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label htmlFor="group-name" className="text-sm font-medium text-gray-800">
                Group name
              </label>
              <input
                id="group-name"
                placeholder="Weekend trip"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <button type="submit" className={btnPrimary}>
              Create group
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
