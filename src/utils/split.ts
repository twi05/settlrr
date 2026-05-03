import type { Member, Transaction } from "@/types";

/** Net balance per member: positive = owed to them, negative = they owe. */
export function computeBalances(
  members: Member[],
  transactions: Transaction[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const m of members) balances[m.id] = 0;

  for (const t of transactions) {
    const n = t.splitBetween.length;
    if (n === 0) continue;
    const share = t.amount / n;
    balances[t.paidBy] = (balances[t.paidBy] ?? 0) + t.amount;
    for (const id of t.splitBetween) {
      balances[id] = (balances[id] ?? 0) - share;
    }
  }
  return balances;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

const EPS = 0.005;

/** Greedy minimum cash flow settlement. */
export function computeSettlements(balances: Record<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, bal] of Object.entries(balances)) {
    if (bal < -EPS) debtors.push({ id, amount: -bal });
    else if (bal > EPS) creditors.push({ id, amount: bal });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(pay * 100) / 100;
    if (rounded >= 0.01) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: rounded,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < EPS) i++;
    if (creditors[j].amount < EPS) j++;
  }

  return transfers;
}
