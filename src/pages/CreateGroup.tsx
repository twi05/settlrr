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
  "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settlrr</h1>
          <p className="mt-1 text-sm text-gray-500">Math off. Party on.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Create a new group</h2>
            <p className="mt-0.5 text-sm text-blue-100">
              Name your trip or household — you'll get a shareable link.
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-5">
              <div className="grid gap-2">
                <label htmlFor="group-name" className="text-sm font-medium text-gray-700">
                  Group name
                </label>
                <input
                  id="group-name"
                  placeholder="e.g. Goa Trip, Flatmates, Office Lunch"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  className={inputClass}
                />
              </div>
              <button type="submit" className={btnPrimary}>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create group
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          No account needed · Share via link
        </p>
      </div>
    </div>
  );
}
