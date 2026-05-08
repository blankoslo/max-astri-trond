import type { Expense, Settlement } from "@/types";

// ─── LocalStorage persistence ─────────────────────────────────────────────────

function storageKey(tripId: string) {
  return `fk_expenses_${tripId}`;
}

export function getExpenses(tripId: string): Expense[] {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

function persist(tripId: string, expenses: Expense[]): void {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(expenses));
  } catch {
    /* noop — private/incognito browsers may block writes */
  }
}

export function addExpense(
  tripId: string,
  input: Omit<Expense, "id" | "trip_id" | "created_at">,
): Expense {
  const expense: Expense = {
    ...input,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    trip_id: tripId,
    created_at: new Date().toISOString(),
  };
  const all = getExpenses(tripId);
  all.push(expense);
  persist(tripId, all);
  return expense;
}

export function removeExpense(tripId: string, expenseId: string): void {
  const all = getExpenses(tripId).filter((e) => e.id !== expenseId);
  persist(tripId, all);
}

// ─── Split algorithm ──────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calculate each participant's net balance across all expenses.
 * Positive  → the person is owed money (they paid more than their share).
 * Negative  → the person owes money (they were covered by others).
 */
export function calculateBalances(expenses: Expense[]): Map<string, number> {
  const bal = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.split_among.length === 0) continue;
    const share = round2(exp.amount / exp.split_among.length);

    // Payer is credited the full amount they put in
    bal.set(exp.payer_id, round2((bal.get(exp.payer_id) ?? 0) + exp.amount));

    // Everyone sharing the expense is debited their portion
    for (const pid of exp.split_among) {
      bal.set(pid, round2((bal.get(pid) ?? 0) - share));
    }
  }

  return bal;
}

/**
 * Given net balances, produce the minimum set of transfers that clears all debts.
 * Uses a greedy two-pointer approach:
 *   1. Sort creditors (positive) and debtors (negative) descending by amount.
 *   2. Match the largest creditor with the largest debtor at each step.
 *   3. The smaller of the two is fully resolved; the remainder carries forward.
 *
 * This produces at most N-1 transactions for N participants.
 */
export function minimizeSettlements(balances: Map<string, number>): Settlement[] {
  const settlements: Settlement[] = [];

  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors:   Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of balances) {
    const b = round2(balance);
    if (b > 0.01)  creditors.push({ id, amount: b });
    if (b < -0.01) debtors.push({ id, amount: -b });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = round2(Math.min(c.amount, d.amount));

    if (amount > 0.01) {
      settlements.push({ from: d.id, to: c.id, amount });
    }

    c.amount = round2(c.amount - amount);
    d.amount = round2(d.amount - amount);

    if (c.amount <= 0.01) ci++;
    if (d.amount <= 0.01) di++;
  }

  return settlements;
}
