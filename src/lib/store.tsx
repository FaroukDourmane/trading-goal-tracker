import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildBalanceTimeline, computeAnalytics, toDateKey, type Goal, type TradeEntry, type DayStat, type Analytics } from "./trading";

const KEY_GOAL = "tp:goal:v1";
const KEY_TRADES = "tp:trades:v1";

const defaultGoal: Goal = {
  startingBalance: 1000,
  targetBalance: 10000,
  dailyTargetPct: 2,
  leverage: 20,
  startDate: toDateKey(new Date()),
  riskPerTradePct: 1,
  tradingDaysPerWeek: 5,
};

function seedTrades(start: number): TradeEntry[] {
  const out: TradeEntry[] = [];
  const today = new Date();
  for (let i = 20; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    // pseudo-random but stable
    const r = Math.sin(i * 7.3) * 0.5;
    const pct = +(1.6 + r * 3.2).toFixed(2); // mostly green
    out.push({
      id: crypto.randomUUID(),
      date: toDateKey(d),
      trades: 2 + Math.floor(Math.abs(r) * 5),
      pnlPct: pct,
      winRate: 55 + Math.round(r * 20),
      market: ["Forex", "Crypto", "Stocks"][i % 3] as TradeEntry["market"],
      notes: pct > 0 ? "Followed plan, clean breakout setup." : "Forced a setup, broke rules.",
    });
  }
  return out;
}

interface Ctx {
  goal: Goal;
  trades: TradeEntry[];
  timeline: DayStat[];
  analytics: Analytics;
  setGoal: (g: Goal) => void;
  addTrade: (t: Omit<TradeEntry, "id">) => void;
  updateTrade: (id: string, patch: Partial<TradeEntry>) => void;
  deleteTrade: (id: string) => void;
  resetAll: () => void;
  loadSample: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [goal, setGoalState] = useState<Goal>(defaultGoal);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const g = localStorage.getItem(KEY_GOAL);
      const t = localStorage.getItem(KEY_TRADES);
      if (g) setGoalState(JSON.parse(g));
      if (t) setTrades(JSON.parse(t));
      else {
        const seeded = seedTrades(g ? JSON.parse(g).startingBalance : defaultGoal.startingBalance);
        setTrades(seeded);
        localStorage.setItem(KEY_TRADES, JSON.stringify(seeded));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(KEY_GOAL, JSON.stringify(goal)); }, [goal, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(KEY_TRADES, JSON.stringify(trades)); }, [trades, hydrated]);

  const setGoal = useCallback((g: Goal) => setGoalState(g), []);
  const addTrade = useCallback((t: Omit<TradeEntry, "id">) =>
    setTrades((prev) => [...prev.filter((x) => x.date !== t.date), { ...t, id: crypto.randomUUID() }]), []);
  const updateTrade = useCallback((id: string, patch: Partial<TradeEntry>) =>
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const deleteTrade = useCallback((id: string) =>
    setTrades((prev) => prev.filter((t) => t.id !== id)), []);
  const resetAll = useCallback(() => { setGoalState(defaultGoal); setTrades([]); }, []);
  const loadSample = useCallback(() => setTrades(seedTrades(goal.startingBalance)), [goal.startingBalance]);

  const timeline = useMemo(() => buildBalanceTimeline(goal, trades), [goal, trades]);
  const analytics = useMemo(() => computeAnalytics(goal, timeline), [goal, timeline]);

  const value: Ctx = { goal, trades, timeline, analytics, setGoal, addTrade, updateTrade, deleteTrade, resetAll, loadSample };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
