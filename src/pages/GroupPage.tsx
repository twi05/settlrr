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
  "rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-sm";

const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const btnSecondary =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
      note: "Settlrr",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center text-gray-500 text-sm">
        Invalid link
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">Loading group…</p>
      </div>
    );
  }

  if (!group) return null;

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 flex flex-col items-center justify-center">
        {/* Top branding */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Settlrr</span>
        </div>

        <div className="w-full max-w-md space-y-3">
          {isLocalBootstrap && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">First time here?</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Add yourself to start tracking expenses with this group on this device.
              </p>
            </div>
          )}
          {!isLocalBootstrap && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-blue-800">{group.name}</p>
              <p className="text-xs text-blue-600 mt-0.5">{members.length} {members.length === 1 ? "member" : "members"} · Tap your name to join</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-28">
      {/* Top nav bar */}
      <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-gray-900">Settlrr</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={btnSecondary} onClick={() => void copyShareLink()}>
              {copied ? (
                <span className="flex items-center gap-1 text-green-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share
                </span>
              )}
            </button>
            <button type="button" className={btnSecondary} onClick={openSettings}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="ml-1">Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
        {/* Group hero */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-lg shadow-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Group</p>
              <h1 className="mt-1 text-2xl font-bold text-white leading-tight">{group.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                  Code: <span className="font-mono">{groupId}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className={`${cardClass} overflow-hidden ${
          balanceLabel.tone === "owe" ? "border-red-200" : balanceLabel.tone === "get" ? "border-green-200" : ""
        }`}>
          <div className={`px-5 py-4 ${
            balanceLabel.tone === "owe" ? "bg-gradient-to-r from-red-50 to-rose-50" :
            balanceLabel.tone === "get" ? "bg-gradient-to-r from-green-50 to-emerald-50" :
            "bg-gradient-to-r from-gray-50 to-slate-50"
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your balance</p>
            <p className={`mt-1.5 text-3xl font-bold ${
              balanceLabel.tone === "owe" ? "text-red-500" :
              balanceLabel.tone === "get" ? "text-green-600" :
              "text-gray-800"
            }`}>
              {balanceLabel.text}
            </p>
            {balanceLabel.tone !== "ok" && (
              <p className="mt-1 text-xs text-gray-500">
                {balanceLabel.tone === "owe" ? "You owe money to the group" : "The group owes you money"}
              </p>
            )}
          </div>
        </div>

        {/* Settle up toggle */}
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Group settlements</p>
              <p className="mt-0.5 text-xs text-gray-500">Who pays whom to settle all debts</p>
            </div>
            <ToggleSwitch id="settlements" checked={showSettlements} onCheckedChange={setShowSettlements} />
          </div>
        </div>

        {showSettlements && (
          <div className={cardClass}>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Optimal balancing</p>
                  <p className="mt-0.5 text-xs text-gray-500">Minimises number of transactions</p>
                </div>
                <ToggleSwitch id="settlement-optimal" checked={optimalSettlement} onCheckedChange={setOptimalSettlement} />
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-800">Settle up</p>
                {settlements.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-green-200 bg-green-50 py-6 text-center">
                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm font-medium text-green-700">Everyone is settled up!</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {settlements.map((s, i) => {
                      const payee = members.find((m) => m.id === s.to);
                      const doSelfHaveToPay = selfId === s.from;
                      const canPay = payee?.upiId && doSelfHaveToPay;
                      return (
                        <li key={`${s.from}-${s.to}-${i}`} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                          doSelfHaveToPay ? "border-red-100 bg-red-50" : "border-gray-100 bg-white"
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(s.from)}`}>
                              {initials(displayName(s.from, selfId, members))}
                            </span>
                            <div className="min-w-0">
                              <span className="font-medium text-gray-900">{displayName(s.from, selfId, members)}</span>
                              <span className="mx-1.5 text-gray-400">→</span>
                              <span className="font-medium text-gray-900">{displayName(s.to, selfId, members)}</span>
                              <p className="text-xs text-gray-500 mt-0.5">{formatInr(s.amount)}</p>
                            </div>
                          </div>
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => payee && handlePayNow(payee, s.amount)}
                              className="shrink-0 inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
                            >
                              Pay Now
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        <section className="flex flex-col gap-3">
          <h2 className="px-0.5 text-sm font-semibold text-gray-700">Members</h2>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  m.id === selfId
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-700 shadow-sm"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(m.id)}`}>
                  {initials(m.name)}
                </span>
                <span className={m.id === selfId ? "font-semibold" : "font-medium"}>{m.name}</span>
                {m.id === selfId && <span className="text-xs text-blue-500">You</span>}
                {m.upiId && (
                  <span className="text-[10px] text-green-600" title="UPI linked">●</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Transactions */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-semibold text-gray-700">Expenses</h2>
            {sortedTransactions.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {sortedTransactions.length}
              </span>
            )}
          </div>
          {sortedTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">No expenses yet</p>
                <p className="mt-0.5 text-xs text-gray-400">Tap "Add expense" below to get started.</p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {sortedTransactions.map((t) => {
                const payer = members.find((m) => m.id === t.paidBy);
                const splitNames = t.splitBetween.map((id) => displayName(id, selfId, members));
                const perPerson = t.splitBetween.length > 0 ? t.amount / t.splitBetween.length : 0;
                const youAreInvolved = t.splitBetween.includes(selfId ?? "");
                return (
                  <li key={t.id}>
                    <div className={`${cardClass} ${youAreInvolved ? "border-blue-100" : ""}`}>
                      <div className="flex items-start gap-3 p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${avatarColor(t.paidBy)}`}>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {payer?.id === selfId ? "You" : payer?.name ?? "Someone"} paid
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Split with {splitNames.join(", ")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900">{formatInr(t.amount)}</p>
                              <p className="text-xs text-gray-400">{formatInr(perPerson)} each</p>
                            </div>
                          </div>
                          {youAreInvolved && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              You're in this
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/80 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <button type="button" className={btnPrimary} onClick={() => setExpenseOpen(true)}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 id="settings-dialog-title" className="text-lg font-bold text-gray-900">Your settings</h2>
                <p className="mt-0.5 text-sm text-gray-500">Update your name and UPI details.</p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="flex flex-col gap-5 p-6">
              <div className="grid gap-2">
                <label htmlFor="settings-name" className="text-sm font-semibold text-gray-700">Name</label>
                <input
                  id="settings-name"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="settings-upi" className="text-sm font-semibold text-gray-700">
                  UPI ID
                  <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">optional</span>
                </label>
                <input
                  id="settings-upi"
                  value={settingsUpiId}
                  onChange={(e) => setSettingsUpiId(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="rahul@oksbi"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400">Lets others pay you directly via UPI.</p>
              </div>
              {settingsError && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {settingsError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 id="qr-dialog-title" className="text-lg font-bold text-gray-900">Scan to pay</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Scan in any UPI app to pay {qrPayeeName} {formatInr(qrAmount)}.
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                onClick={() => setQrOpen(false)}
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="rounded-2xl border-2 border-gray-100 bg-white p-3 shadow-inner">
                <img
                  src={createUpiQrUrl(qrDeepLink)}
                  alt="UPI payment QR code"
                  className="h-64 w-64 rounded-xl"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => void handleCopyQrLink()}
              >
                {qrLinkCopied ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Link copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copy UPI link
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
