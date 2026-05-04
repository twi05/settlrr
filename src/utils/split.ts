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

type Side = { id: string; amount: number };

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyToCents(n: number): number {
  return Math.round(n * 100);
}

function partitionSides(balances: Record<string, number>): {
  debtors: Side[];
  creditors: Side[];
} {
  const debtors: Side[] = [];
  const creditors: Side[] = [];
  for (const [id, bal] of Object.entries(balances)) {
    if (bal < -EPS) debtors.push({ id, amount: -bal });
    else if (bal > EPS) creditors.push({ id, amount: bal });
  }
  return { debtors, creditors };
}

/**
 * Greedy “largest debtor ↔ largest creditor” matching on mutable side lists.
 */
function greedyFromSides(debtors: Side[], creditors: Side[]): Transfer[] {
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = roundMoney(pay);
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

/**
 * Greedy “largest debtor ↔ largest creditor” matching.
 * Good for explainability; pure greedy without an exact-match pass first.
 */
export function computeSettlementsGreedy(
  balances: Record<string, number>,
): Transfer[] {
  const { debtors, creditors } = partitionSides(balances);
  const d = debtors.map((x) => ({ ...x }));
  const c = creditors.map((x) => ({ ...x }));
  d.sort((a, b) => b.amount - a.amount);
  c.sort((a, b) => b.amount - a.amount);
  return greedyFromSides(d, c);
}

/**
 * Almost-optimal (MVP-friendly): split debtors / creditors, pair **exact**
 * amounts first (bucket by rupee-paise cents), then run greedy on the rest.
 */
export function computeSettlementsOptimal(
  balances: Record<string, number>,
): Transfer[] {
  const { debtors, creditors } = partitionSides(balances);

  const buckets = new Map<number, Side[]>();
  for (const c of creditors) {
    const key = moneyToCents(c.amount);
    const arr = buckets.get(key);
    if (arr) arr.push({ ...c });
    else buckets.set(key, [{ ...c }]);
  }

  const exactTransfers: Transfer[] = [];
  const debtorsLeft: Side[] = [];

  for (const d of debtors) {
    const key = moneyToCents(d.amount);
    const bucket = buckets.get(key);
    if (bucket && bucket.length > 0) {
      const c = bucket.pop()!;
      if (bucket.length === 0) buckets.delete(key);
      exactTransfers.push({
        from: d.id,
        to: c.id,
        amount: roundMoney(d.amount),
      });
    } else {
      debtorsLeft.push({ ...d });
    }
  }

  const creditorsLeft: Side[] = [];
  for (const [, bucket] of buckets) {
    for (const c of bucket) creditorsLeft.push(c);
  }

  debtorsLeft.sort((a, b) => b.amount - a.amount);
  creditorsLeft.sort((a, b) => b.amount - a.amount);

  return [...exactTransfers, ...greedyFromSides(debtorsLeft, creditorsLeft)];
}
