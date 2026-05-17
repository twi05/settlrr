import { useState } from "react";
import type { Member } from "@/types";
import { useAppDispatch } from "@/store/hooks";
import { addMember } from "@/store/slices/groupSlices";
import { isValidUpiId } from "@/lib/upi";

const inputClass =
  "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex h-auto min-h-[2.75rem] items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.97]";

type Props = {
  groupId: string;
  members: Member[];
  onJoined: () => void;
};

export default function JoinForm({ groupId, members, onJoined }: Props) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<"pick" | "new">(
    members.length ? "pick" : "new",
  );
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");

  const setCurrentMember = (memberId: string) => {
    localStorage.setItem(`memberId_${groupId}`, memberId);
    onJoined();
  };

  const handleNewMember = () => {
    const trimmed = name.trim();
    const trimmedUpi = upiId.trim();
    if (!trimmed) return;
    if (trimmedUpi && !isValidUpiId(trimmedUpi)) return;
    const member: Member = {
      id: crypto.randomUUID(),
      name: trimmed,
      upiId: trimmedUpi || undefined,
      groupId,
      createdAt: Date.now(),
    };
    dispatch(addMember(member));
    localStorage.setItem(`memberId_${groupId}`, member.id);
    onJoined();
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-100">
      {/* Header band */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Join group</h2>
        <p className="mt-0.5 text-sm text-blue-100">
          {members.length > 0
            ? "Already a member? Pick your name, or add yourself."
            : "Add your name to start tracking expenses."}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {members.length > 0 && mode === "pick" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">I am…</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={btnSecondary}
                  onClick={() => setCurrentMember(m.id)}
                >
                  <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-1 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500"
              onClick={() => setMode("new")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              I'm not in the list
            </button>
          </div>
        )}

        {(members.length === 0 || mode === "new") && (
          <div className="flex flex-col gap-4">
            {members.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setMode("pick")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Choose from existing members
              </button>
            )}
            <div className="grid gap-2">
              <label htmlFor="join-name" className="text-sm font-medium text-gray-700">
                Your name
              </label>
              <input
                id="join-name"
                placeholder="e.g. Amit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="join-upi" className="text-sm font-medium text-gray-700">
                UPI ID
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">optional</span>
              </label>
              <input
                id="join-upi"
                placeholder="rahul@oksbi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
              {upiId.trim() && !isValidUpiId(upiId) && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Please enter a valid UPI ID (e.g. name@bank).
                </p>
              )}
              {!upiId.trim() && (
                <p className="text-xs text-gray-400">Enables "Pay Now" button for others to pay you directly.</p>
              )}
            </div>
            <button
              type="button"
              className={btnPrimary}
              onClick={handleNewMember}
            >
              Join group →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
