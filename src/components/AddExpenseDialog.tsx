import { useEffect, useRef, useState } from "react";
import type { Member } from "@/types";

const inputClass =
  "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

const btnPrimary =
  "inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentMemberId: string;
  onAddMember: (name: string, upiId?: string) => Member;
  onAddExpense: (payload: {
    amount: number;
    paidBy: string;
    splitBetween: string[];
  }) => void;
};

export function AddExpenseDialog({
  open,
  onOpenChange,
  members,
  currentMemberId,
  onAddMember,
  onAddExpense,
}: Props) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentMemberId);
  const [splitIds, setSplitIds] = useState<Set<string>>(() => new Set());
  const [newName, setNewName] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPaidBy(currentMemberId);
      setAmount("");
      setNewName("");
      setSplitIds(new Set(members.map((m) => m.id)));
    }
    wasOpenRef.current = open;
  }, [open, currentMemberId, members]);

  const toggleSplit = (id: string, checked: boolean) => {
    setSplitIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAddPersonToSplit = () => {
    const name = newName.trim();
    if (!name) return;
    const m = onAddMember(name);
    setSplitIds((prev) => new Set(prev).add(m.id));
    setNewName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    const splitBetween = [...splitIds];
    if (splitBetween.length === 0) return;
    if (!paidBy) return;
    onAddExpense({ amount: n, paidBy, splitBetween });
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative z-10 flex max-h-[min(92vh,680px)] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="expense-dialog-title" className="text-lg font-bold text-gray-900">
              Add expense
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Enter the amount, who paid, and who shares it.
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          {/* Amount */}
          <div className="grid gap-2">
            <label htmlFor="amount" className="text-sm font-semibold text-gray-700">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
                autoFocus
                className={`${inputClass} pl-8 text-lg font-semibold`}
              />
            </div>
          </div>

          {/* Paid by */}
          <div className="grid gap-2">
            <label htmlFor="paid-by" className="text-sm font-semibold text-gray-700">
              Paid by
            </label>
            <select
              id="paid-by"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={inputClass}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.id === currentMemberId ? " (You)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Split between */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Split between</span>
              <span className="text-xs text-gray-400">{splitIds.size} selected</span>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={splitIds.has(m.id)}
                    onChange={(e) => toggleSplit(m.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">
                    {m.name}{m.id === currentMemberId ? " (You)" : ""}
                  </span>
                </label>
              ))}
              <div className="flex gap-2 p-3 bg-white">
                <input
                  placeholder="Add someone new…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPersonToSplit())}
                  className={`${inputClass} flex-1 h-10 text-sm`}
                />
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                  onClick={handleAddPersonToSplit}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" className={btnSecondary} onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary}>
              Save expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
