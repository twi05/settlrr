import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import JoinForm from "@/components/JoinForm";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { loadGroupBundle, saveGroupBundle } from "@/lib/groupStorage";
import { formatInr } from "@/lib/format";
import {
  createUpiDeepLink,
  createUpiQrUrl,
  isDesktopChrome,
  isValidUpiId,
} from "@/lib/upi";
import {
  computeBalances,
  computeSettlementsGreedy,
  computeSettlementsOptimal,
} from "@/utils/split";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addMember,
  addTransaction,
  setGroup,
  setMembers,
  setTransactions,
  updateMember,
} from "@/store/slices/groupSlices";
import type { Member, Transaction } from "@/types";

const BAL_EPS = 0.005;

const cardClass =
  "rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm";

const btnPrimary =
  "inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

function displayName(
  id: string,
  selfId: string | null,
  members: Member[],
): string {
  if (id === selfId) return "You";
  return members.find((m) => m.id === id)?.name ?? "Member";
}

function ToggleSwitch({
  id,
  checked,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const dispatch = useAppDispatch();
  const { group, members, transactions } = useAppSelector((s) => s.group);

  const [hydrated, setHydrated] = useState(false);
  const [isLocalBootstrap, setIsLocalBootstrap] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [showSettlements, setShowSettlements] = useState(false);
  /** When true (default), exact-match pass then greedy; when false, greedy only. */
  const [optimalSettlement, setOptimalSettlement] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsUpiId, setSettingsUpiId] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayeeName, setQrPayeeName] = useState("");
  const [qrAmount, setQrAmount] = useState(0);
  const [qrDeepLink, setQrDeepLink] = useState("");
  const [qrLinkCopied, setQrLinkCopied] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    const bundle = loadGroupBundle(groupId);
    if (!bundle) {
      const bootstrappedGroup = {
        id: groupId,
        name: "New Group",
        createdAt: Date.now(),
      };
      dispatch(setGroup(bootstrappedGroup));
      dispatch(setMembers([]));
      dispatch(setTransactions([]));
      setIsLocalBootstrap(true);
      setHydrated(true);
      return;
    }
    dispatch(setGroup(bundle.group));
    dispatch(setMembers(bundle.members));
    dispatch(setTransactions(bundle.transactions));
    setIsLocalBootstrap(false);
    setHydrated(true);
  }, [groupId, dispatch]);

  useEffect(() => {
    if (!groupId || !hydrated) return;
    setSelfId(localStorage.getItem(`memberId_${groupId}`));
  }, [groupId, hydrated]);

  useEffect(() => {
    if (!hydrated || !group || group.id !== groupId) return;
    saveGroupBundle({ group, members, transactions });
  }, [hydrated, group, members, transactions, groupId]);

  const isJoined =
    Boolean(selfId) && members.some((m) => m.id === selfId);

  const balances = useMemo(
    () => computeBalances(members, transactions),
    [members, transactions],
  );

  const myBalance = selfId ? balances[selfId] ?? 0 : 0;

  const settlements = useMemo(() => {
    return optimalSettlement
      ? computeSettlementsOptimal(balances)
      : computeSettlementsGreedy(balances);
  }, [balances, optimalSettlement]);

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    [transactions],
  );

  const currentMember = useMemo(
    () => members.find((m) => m.id === selfId) ?? null,
    [members, selfId],
  );

  const copyShareLink = async () => {
    if (!groupId) return;
    const url = `${window.location.origin}/g/${groupId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleAddMember = (name: string, upiId?: string): Member => {
    const sanitizedUpi = upiId?.trim();
    const member: Member = {
      id: crypto.randomUUID(),
      name: name.trim(),
      upiId:
        sanitizedUpi && isValidUpiId(sanitizedUpi) ? sanitizedUpi : undefined,
      groupId: groupId!,
      createdAt: Date.now(),
    };
    dispatch(addMember(member));
    return member;
  };

  const handlePayNow = (toMember: Member, amount: number) => {
    if (!toMember.upiId) return;
    const deepLink = createUpiDeepLink({
      upiId: toMember.upiId,
      payeeName: toMember.name,
      amount,
      note: "SplitNow",
    });
    if (!deepLink) return;
    if (isDesktopChrome()) {
      setQrPayeeName(toMember.name);
      setQrAmount(amount);
      setQrDeepLink(deepLink);
      setQrLinkCopied(false);
      setQrOpen(true);
      return;
    }
    window.location.href = deepLink;
  };

  const handleCopyQrLink = async () => {
    if (!qrDeepLink) return;
    try {
      await navigator.clipboard.writeText(qrDeepLink);
      setQrLinkCopied(true);
      window.setTimeout(() => setQrLinkCopied(false), 2000);
    } catch {
      setQrLinkCopied(false);
    }
  };

  const openSettings = () => {
    if (!currentMember) return;
    setSettingsName(currentMember.name);
    setSettingsUpiId(currentMember.upiId ?? "");
    setSettingsError("");
    setSettingsOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;
    const trimmedName = settingsName.trim();
    const trimmedUpi = settingsUpiId.trim();

    if (!trimmedName) {
      setSettingsError("Name is required.");
      return;
    }

    if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
      setSettingsError("Please enter a valid UPI ID.");
      return;
    }

    dispatch(
      updateMember({
        ...currentMember,
        name: trimmedName,
        upiId: trimmedUpi || undefined,
      }),
    );
    setSettingsOpen(false);
  };

  const handleAddExpense = (payload: {
    amount: number;
    paidBy: string;
    splitBetween: string[];
  }) => {
    if (!groupId) return;
    const t: Transaction = {
      id: crypto.randomUUID(),
      groupId,
      amount: payload.amount,
      paidBy: payload.paidBy,
      splitBetween: payload.splitBetween,
      createdAt: Date.now(),
    };
    dispatch(addTransaction(t));
  };

  if (!groupId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center text-gray-600">
        Invalid link
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  if (!group) return null;

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md space-y-3">
          {isLocalBootstrap && (
            <div className={`${cardClass} p-4`}>
              <p className="text-sm text-gray-800 font-medium">
                This group is not in local storage yet.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Create a new user to join this group and start tracking expenses
                on this device.
              </p>
            </div>
          )}
          <JoinForm
            groupId={groupId}
            members={members}
            onJoined={() =>
              setSelfId(localStorage.getItem(`memberId_${groupId}`))
            }
          />
        </div>
      </div>
    );
  }

  const balanceLabel =
    myBalance < -BAL_EPS
      ? { text: `You owe ${formatInr(-myBalance)}`, tone: "owe" as const }
      : myBalance > BAL_EPS
        ? { text: `You get ${formatInr(myBalance)}`, tone: "get" as const }
        : { text: "You're settled up", tone: "ok" as const };

  const balanceCardExtra =
    balanceLabel.tone === "owe"
      ? "border-red-100 bg-red-50"
      : balanceLabel.tone === "get"
        ? "border-green-100 bg-green-50"
        : "";

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 leading-tight">
                {group.name}
              </h1>
              <p className="mt-1 font-mono text-xs text-gray-500">{groupId}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => void copyShareLink()}
              >
                {copied ? "Copied" : "Share"}
              </button>
              <button type="button" className={btnSecondary} onClick={openSettings}>
                Settings
              </button>
            </div>
          </div>

          <div
            className={`${cardClass} overflow-hidden ${balanceCardExtra}`}
          >
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                Your balance
              </p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  balanceLabel.tone === "owe"
                    ? "text-red-500"
                    : balanceLabel.tone === "get"
                      ? "text-green-600"
                      : "text-gray-800"
                }`}
              >
                {balanceLabel.text}
              </p>
            </div>
          </div>
        </header>

        <div className={`${cardClass}`}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="settlements"
                className="text-sm font-medium text-gray-800"
              >
                Show group balance
              </label>
              <p className="text-xs text-gray-600">
                Who should pay whom to settle up
              </p>
            </div>
            <ToggleSwitch
              id="settlements"
              checked={showSettlements}
              onCheckedChange={setShowSettlements}
            />
          </div>
        </div>

        {showSettlements && (
          <div className={cardClass}>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="settlement-optimal"
                    className="text-sm font-medium text-gray-800"
                  >
                    Optimal balancing
                  </label>
                  <p className="text-xs text-gray-600">
                    On: match exact amounts first, then greedy. Off: greedy only
                    (largest debts first).
                  </p>
                </div>
                <ToggleSwitch
                  id="settlement-optimal"
                  checked={optimalSettlement}
                  onCheckedChange={setOptimalSettlement}
                />
              </div>
              <p className="text-sm font-medium text-gray-800">Settle up</p>
              {settlements.length === 0 ? (
                <p className="text-sm text-gray-600">Everyone is even.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {settlements.map((s, i) => (
                    <li
                      key={`${s.from}-${s.to}-${i}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-medium">
                            {displayName(s.from, selfId, members)}
                          </span>
                          <span className="text-gray-600"> → </span>
                          <span className="font-medium">
                            {displayName(s.to, selfId, members)}
                          </span>
                          <span className="text-gray-600">
                            {" "}
                            {formatInr(s.amount)}
                          </span>
                        </div>
                        {(() => {
                          const payee = members.find((m) => m.id === s.to);
                          const canPay = payee;
                          const shouldShow = selfId === s.to;
                          console.log('canpay',s, selfId, shouldShow)

                          if (!shouldShow) return null; // 👈 hides button completely
                           return (
                            <button
                              type="button"
                              
                              disabled={!canPay} 
                              onClick={() => payee && handlePayNow(payee, s.amount)}
                              className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                                canPay
                                  ? "bg-blue-600 text-white hover:bg-blue-500"
                                  : "cursor-not-allowed bg-gray-100 text-gray-400"
                              }`}
                            >
                              Pay Now
                            </button>
                          );
                        })()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="px-0.5 text-sm font-medium text-gray-800">Members</h2>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.id}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${
                  m.id === selfId
                    ? "border-blue-200 bg-blue-50 font-medium text-blue-800"
                    : "border-gray-200 bg-white text-gray-800 shadow-sm"
                }`}
              >
                {m.name}
                {m.id === selfId ? " · You" : ""}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="px-0.5 text-sm font-medium text-gray-800">
            Transactions
          </h2>
          {sortedTransactions.length === 0 ? (
            <div className={`${cardClass} border-dashed`}>
              <div className="p-6 text-center text-sm text-gray-600">
                No expenses yet. Add one below.
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedTransactions.map((t) => {
                const payer = members.find((m) => m.id === t.paidBy);
                const splitNames = t.splitBetween.map((id) =>
                  displayName(id, selfId, members),
                );
                return (
                  <li key={t.id}>
                    <div className={cardClass}>
                      <div className="flex flex-col gap-1 p-4">
                        <p className="font-medium text-gray-800">
                          {payer?.name ?? "Someone"} paid {formatInr(t.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Split between {splitNames.join(", ")}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-gray-50/95 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => setExpenseOpen(true)}
          >
            Add expense
          </button>
        </div>
      </div>

      <AddExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        members={members}
        currentMemberId={selfId!}
        onAddMember={handleAddMember}
        onAddExpense={handleAddExpense}
      />

      {settingsOpen && currentMember && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="relative z-10 flex w-full max-w-lg flex-col rounded-t-xl border border-gray-200 bg-white shadow-lg sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <form onSubmit={handleSaveSettings} className="p-4 pt-10 sm:p-6 sm:pt-8">
              <div className="mb-4 flex flex-col gap-1">
                <h2 id="settings-dialog-title" className="text-lg font-semibold text-gray-800">
                  Your settings
                </h2>
                <p className="text-sm text-gray-600">
                  Update your name and UPI details.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="settings-name" className="text-sm font-medium text-gray-800">
                    Name
                  </label>
                  <input
                    id="settings-name"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="settings-upi" className="text-sm font-medium text-gray-800">
                    UPI ID (optional)
                  </label>
                  <input
                    id="settings-upi"
                    value={settingsUpiId}
                    onChange={(e) => setSettingsUpiId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="rahul@oksbi"
                    autoComplete="off"
                  />
                </div>
                {settingsError && (
                  <p className="text-xs text-red-500">{settingsError}</p>
                )}
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative z-10 flex w-full max-w-lg flex-col rounded-t-xl border border-gray-200 bg-white shadow-lg sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={() => setQrOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="p-4 pt-10 sm:p-6 sm:pt-8">
              <div className="mb-4">
                <h2 id="qr-dialog-title" className="text-lg font-semibold text-gray-800">
                  Scan to pay
                </h2>
                <p className="text-sm text-gray-600">
                  Scan this QR in any UPI app to pay {qrPayeeName}{" "}
                  {formatInr(qrAmount)}.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  src={createUpiQrUrl(qrDeepLink)}
                  alt="UPI payment QR code"
                  className="h-64 w-64 rounded-lg border border-gray-200 bg-white p-2"
                />
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => void handleCopyQrLink()}
                >
                  {qrLinkCopied ? "Link copied" : "Copy UPI link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
