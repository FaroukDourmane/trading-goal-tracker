export type Market = "Forex" | "Crypto" | "Stocks" | "Indices" | "Commodities" | "Other";

export interface Goal {
  startingBalance: number;
  targetBalance: number;
  dailyTargetPct: number; // e.g. 1.5 means +1.5%/day
  leverage?: number;
  startDate: string; // YYYY-MM-DD
  deadline?: string;
  riskPerTradePct: number;
  tradingDaysPerWeek: number;
}

export interface TradeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  trades: number;
  pnlPct: number;        // percentage of balance that day (signed)
  pnlAmount?: number;    // optional override (otherwise computed from pct)
  winRate?: number;
  market?: Market;
  notes?: string;
  imageUrl?: string;
}

export const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const fmtPct = (n: number, digits = 2) =>
  `${n >= 0 ? "+" : ""}${(Number.isFinite(n) ? n : 0).toFixed(digits)}%`;

export const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const daysToReachTarget = (start: number, target: number, dailyPct: number): number => {
  if (start <= 0 || target <= start || dailyPct <= 0) return 0;
  return Math.ceil(Math.log(target / start) / Math.log(1 + dailyPct / 100));
};

export const projectCompoundCurve = (
  start: number,
  dailyPct: number,
  days: number,
): { day: number; balance: number }[] => {
  const out: { day: number; balance: number }[] = [];
  let bal = start;
  for (let i = 0; i <= days; i++) {
    out.push({ day: i, balance: bal });
    bal = bal * (1 + dailyPct / 100);
  }
  return out;
};

export interface DayStat {
  date: string;
  balanceBefore: number;
  balanceAfter: number;
  pnlPct: number;
  pnlAmount: number;
  status: "win-target" | "win" | "loss" | "be" | "none";
  trade: TradeEntry;
}

export const buildBalanceTimeline = (
  goal: Goal,
  trades: TradeEntry[],
): DayStat[] => {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let bal = goal.startingBalance;
  return sorted.map((t) => {
    const before = bal;
    const pnlAmt = t.pnlAmount ?? before * (t.pnlPct / 100);
    const after = before + pnlAmt;
    bal = after;
    let status: DayStat["status"];
    if (Math.abs(t.pnlPct) < 0.01) status = "be";
    else if (t.pnlPct >= goal.dailyTargetPct) status = "win-target";
    else if (t.pnlPct > 0) status = "win";
    else status = "loss";
    return {
      date: t.date,
      balanceBefore: before,
      balanceAfter: after,
      pnlPct: t.pnlPct,
      pnlAmount: pnlAmt,
      status,
      trade: t,
    };
  });
};

export interface Analytics {
  currentBalance: number;
  totalPnL: number;
  roiPct: number;
  avgDailyReturn: number;
  winRate: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  streak: { type: "win" | "loss" | "none"; count: number };
  remainingToTarget: number;
  progressPct: number;
  estDaysRemaining: number;
  requiredAvgDailyPct: number;
  estCompletionDate?: string;
}

export const computeAnalytics = (goal: Goal, timeline: DayStat[]): Analytics => {
  const current = timeline.length ? timeline[timeline.length - 1].balanceAfter : goal.startingBalance;
  const totalPnL = current - goal.startingBalance;
  const roi = (totalPnL / goal.startingBalance) * 100;
  const wins = timeline.filter((d) => d.pnlAmount > 0);
  const losses = timeline.filter((d) => d.pnlAmount < 0);
  const winRate = timeline.length ? (wins.length / timeline.length) * 100 : 0;
  const grossWin = wins.reduce((s, d) => s + d.pnlAmount, 0);
  const grossLoss = Math.abs(losses.reduce((s, d) => s + d.pnlAmount, 0));
  const pf = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
  const avgDaily = timeline.length ? timeline.reduce((s, d) => s + d.pnlPct, 0) / timeline.length : 0;
  const largestWin = wins.reduce((m, d) => Math.max(m, d.pnlAmount), 0);
  const largestLoss = losses.reduce((m, d) => Math.min(m, d.pnlAmount), 0);

  // streak
  let streakType: "win" | "loss" | "none" = "none";
  let streakCount = 0;
  for (let i = timeline.length - 1; i >= 0; i--) {
    const d = timeline[i];
    const t: "win" | "loss" | "none" =
      d.pnlAmount > 0 ? "win" : d.pnlAmount < 0 ? "loss" : "none";
    if (i === timeline.length - 1) { streakType = t; streakCount = 1; }
    else if (t === streakType && t !== "none") streakCount++;
    else break;
  }

  const remaining = Math.max(0, goal.targetBalance - current);
  const progress = Math.min(100, (current / goal.targetBalance) * 100);
  const estDays = daysToReachTarget(current, goal.targetBalance, goal.dailyTargetPct);

  // required avg daily if a deadline exists
  let required = goal.dailyTargetPct;
  if (goal.deadline) {
    const remDays = Math.max(
      1,
      Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000),
    );
    if (current < goal.targetBalance) {
      required = (Math.pow(goal.targetBalance / current, 1 / remDays) - 1) * 100;
    }
  }

  let estCompletion: string | undefined;
  if (estDays > 0) {
    const d = new Date();
    // approximate using trading days per week
    const calendarDays = Math.ceil(estDays * (7 / Math.max(1, goal.tradingDaysPerWeek)));
    d.setDate(d.getDate() + calendarDays);
    estCompletion = d.toISOString().slice(0, 10);
  }

  return {
    currentBalance: current,
    totalPnL,
    roiPct: roi,
    avgDailyReturn: avgDaily,
    winRate,
    profitFactor: pf,
    largestWin,
    largestLoss,
    streak: { type: streakType, count: streakCount },
    remainingToTarget: remaining,
    progressPct: progress,
    estDaysRemaining: estDays,
    requiredAvgDailyPct: required,
    estCompletionDate: estCompletion,
  };
};
