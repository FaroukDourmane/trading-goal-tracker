import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/app/StatCard";
import { fmtMoney, fmtPct, projectCompoundCurve } from "@/lib/trading";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Wallet, Target, Flame, Percent, Trophy, ArrowDownRight, ArrowUpRight, CalendarClock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard — Apex Edge" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { goal, timeline, analytics, loadSample, trades } = useStore();

  const equity = [
    { i: 0, balance: goal.startingBalance, date: goal.startDate },
    ...timeline.map((d, i) => ({ i: i + 1, balance: d.balanceAfter, date: d.date })),
  ];
  const projection = projectCompoundCurve(analytics.currentBalance, goal.dailyTargetPct, analytics.estDaysRemaining || 30);

  const dailyPnl = timeline.slice(-20).map((d) => ({ date: d.date.slice(5), pnl: d.pnlAmount, pct: d.pnlPct }));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Performance Overview</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Compounding to <span className="text-gradient">{fmtMoney(goal.targetBalance)}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily target {goal.dailyTargetPct}% · Risk/trade {goal.riskPerTradePct}% · {goal.tradingDaysPerWeek} trading days/wk
          </p>
        </div>
        <div className="flex gap-2">
          {trades.length === 0 && (
            <Button variant="secondary" onClick={loadSample}>Load sample data</Button>
          )}
          <Link to="/journal">
            <Button>+ Log today</Button>
          </Link>
        </div>
      </header>

      {/* Goal progress */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Goal progress</span>
          <span className="tabular-nums font-medium">{analytics.progressPct.toFixed(1)}%</span>
        </div>
        <div className="mt-3">
          <Progress value={analytics.progressPct} />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Mini label="Start" value={fmtMoney(goal.startingBalance)} />
          <Mini label="Current" value={fmtMoney(analytics.currentBalance)} tone="success" />
          <Mini label="Remaining" value={fmtMoney(analytics.remainingToTarget)} />
          <Mini label="ETA" value={analytics.estCompletionDate ?? "—"} icon={<CalendarClock className="size-3.5" />} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard label="Balance" value={fmtMoney(analytics.currentBalance)} icon={<Wallet className="size-4" />} />
        <StatCard label="Total P&L" value={fmtMoney(analytics.totalPnL)}
          tone={analytics.totalPnL >= 0 ? "success" : "danger"}
          sub={`ROI ${fmtPct(analytics.roiPct)}`}
          icon={<TrendingUp className="size-4" />} />
        <StatCard label="Win rate" value={`${analytics.winRate.toFixed(0)}%`}
          icon={<Percent className="size-4" />}
          sub={`${timeline.filter(d => d.pnlAmount > 0).length}W / ${timeline.filter(d => d.pnlAmount < 0).length}L`} />
        <StatCard label="Avg daily" value={fmtPct(analytics.avgDailyReturn)}
          tone={analytics.avgDailyReturn >= goal.dailyTargetPct ? "success" : "warning"}
          sub={`Target ${goal.dailyTargetPct}%`}
          icon={<Target className="size-4" />} />
        <StatCard label="Streak" value={`${analytics.streak.count}d`}
          tone={analytics.streak.type === "win" ? "success" : analytics.streak.type === "loss" ? "danger" : "default"}
          sub={analytics.streak.type === "none" ? "—" : `${analytics.streak.type} streak`}
          icon={<Flame className="size-4" />} />
        <StatCard label="Profit factor"
          value={Number.isFinite(analytics.profitFactor) ? analytics.profitFactor.toFixed(2) : "∞"}
          icon={<Trophy className="size-4" />} />
        <StatCard label="Largest win" value={fmtMoney(analytics.largestWin)} tone="success"
          icon={<ArrowUpRight className="size-4" />} />
        <StatCard label="Largest loss" value={fmtMoney(analytics.largestLoss)} tone="danger"
          icon={<ArrowDownRight className="size-4" />} />
        <StatCard label="Days to target" value={analytics.estDaysRemaining || "—"}
          sub={`Need avg ${fmtPct(analytics.requiredAvgDailyPct)}/day`} />
        <StatCard label="Remaining" value={fmtMoney(analytics.remainingToTarget)} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <ChartHeader title="Equity Curve" subtitle="Balance over logged trading days" />
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Tooltip content={<ChartTip valueFmt={(v) => fmtMoney(Number(v))} />} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <ChartHeader title="Daily P&L" subtitle="Last 20 sessions" />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dailyPnl}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => `${v}`} />
                <Tooltip content={<ChartTip valueFmt={(v) => fmtMoney(Number(v))} />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyPnl.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <ChartHeader title="Compound Projection" subtitle={`At ${goal.dailyTargetPct}%/day from current balance`} />
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="pj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={60}
                tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
              <Tooltip content={<ChartTip valueFmt={(v) => fmtMoney(Number(v))} />} />
              <Area type="monotone" dataKey="balance" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#pj)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone, icon }: { label: string; value: React.ReactNode; tone?: "success" | "danger"; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className={`tabular-nums font-medium ${tone === "success" ? "text-[color:var(--color-success)]" : tone === "danger" ? "text-[color:var(--color-destructive)]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ChartTip({ active, payload, label, valueFmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="font-medium tabular-nums">{valueFmt ? valueFmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
