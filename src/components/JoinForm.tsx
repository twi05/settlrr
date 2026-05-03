import { useState } from "react";
import type { Member } from "@/types";
import { useAppDispatch } from "@/store/hooks";
import { addMember } from "@/store/slices/groupSlices";
import { isValidUpiId } from "@/lib/upi";

const inputClass =
  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const btnPrimary =
  "inline-flex h-10 w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

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
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4 pb-2">
        <h2 className="text-xl font-semibold leading-none tracking-tight text-gray-800">
          Join group
        </h2>
        <p className="text-sm text-gray-600">
          Pick your name if you&apos;re already in the list, or add yourself.
        </p>
      </div>
      <div className="flex flex-col gap-4 p-4 pt-0">
        {members.length > 0 && mode === "pick" && (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-800">I am…</span>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={btnSecondary}
                  onClick={() => setCurrentMember(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-left text-sm font-medium text-blue-600 hover:text-blue-500"
              onClick={() => setMode("new")}
            >
              Add new user
            </button>
          </div>
        )}

        {(members.length === 0 || mode === "new") && (
          <div className="flex flex-col gap-3">
            {members.length > 0 && (
              <button
                type="button"
                className="text-left text-sm font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setMode("pick")}
              >
                ← Choose from list
              </button>
            )}
            <div className="grid gap-2">
              <label htmlFor="join-name" className="text-sm font-medium text-gray-800">
                Your name
              </label>
              <input
                id="join-name"
                placeholder="e.g. Amit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="join-upi" className="text-sm font-medium text-gray-800">
                UPI ID (optional)
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
                <p className="text-xs text-red-500">Please enter a valid UPI ID.</p>
              )}
            </div>
            <button
              type="button"
              className={btnPrimary}
              onClick={handleNewMember}
            >
              Join group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
