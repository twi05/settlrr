import { useEffect, useRef, useState } from "react";
import type { Member } from "@/types";

const inputClass =
  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const btnPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-y-auto rounded-t-xl border border-gray-200 bg-white shadow-lg sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          ✕
        </button>
        <form onSubmit={handleSubmit} className="p-4 pt-10 sm:p-6 sm:pt-8">
          <div className="mb-4 flex flex-col gap-1">
            <h2
              id="expense-dialog-title"
              className="text-lg font-semibold text-gray-800"
            >
              Add expense
            </h2>
            <p className="text-sm text-gray-600">
              Enter amount, who paid, and who shares the cost.
            </p>
          </div>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium text-gray-800">
                Amount
              </label>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="paid-by" className="text-sm font-medium text-gray-800">
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
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-gray-800">
                Split between
              </span>
              <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-col gap-3">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={splitIds.has(m.id)}
                        onChange={(e) => toggleSplit(m.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    placeholder="New member name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={handleAddPersonToSplit}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => onOpenChange(false)}
            >
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
