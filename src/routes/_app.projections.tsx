import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { daysToReachTarget, fmtMoney } from "@/lib/trading";

export const Route = createFileRoute("/_app/projections")({
  head: () => ({ meta: [{ title: "Projections — Apex Edge" }] }),
  component: ProjectionsPage,
});

function ProjectionsPage() {
  const { goal, analytics } = useStore();
  const [dailyPct, setDailyPct] = useState(goal.dailyTargetPct);
  const [missedPerMonth, setMissedPerMonth] = useState(0);
  const [losingStreak, setLosingStreak] = useState(0);
  const [lossPct, setLossPct] = useState(1);
  const [horizon, setHorizon] = useState(180);

  const data = useMemo(() => {
    const start = analytics.currentBalance || goal.startingBalance;
    const ideal: { day: number; ideal: number; realistic: number }[] = [];
    let i = start, r = start;
    for (let d = 0; d <= horizon; d++) {
      ideal.push({ day: d, ideal: i, realistic: r });
      i = i * (1 + dailyPct / 100);
      // realistic: simulate missed days + losing streaks
      const tradingDay = d % 30 >= missedPerMonth; // first N days of each month missed
      if (!tradingDay) continue;
      // periodic losing streak every 30 days
      const inStreak = (d % 30) < losingStreak;
      r = r * (1 + (inStreak ? -lossPct : dailyPct) / 100);
    }
    return ideal;
  }, [dailyPct, missedPerMonth, losingStreak, lossPct, horizon, analytics.currentBalance, goal.startingBalance]);

  const daysIdeal = daysToReachTarget(analytics.currentBalance || goal.startingBalance, goal.targetBalance, dailyPct);
  const daysRealistic = data.findIndex((d) => d.realistic >= goal.targetBalance);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">What-If Lab</p>
        <h1 className="text-3xl font-semibold tracking-tight">Goal Projection Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">Stress-test your plan against missed days and losing streaks.</p>
      </header>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-1 flex flex-col gap-5">
          <SliderField label={`Daily target %`} value={dailyPct} min={0.1} max={10} step={0.1}
            onChange={setDailyPct} format={(v) => `${v.toFixed(2)}%`} />
          <SliderField label="Missed trading days / month" value={missedPerMonth} min={0} max={20} step={1}
            onChange={setMissedPerMonth} format={(v) => `${v} days`} />
          <SliderField label="Losing days per month" value={losingStreak} min={0} max={15} step={1}
            onChange={setLosingStreak} format={(v) => `${v} days`} />
          <SliderField label="Loss size %" value={lossPct} min={0.1} max={5} step={0.1}
            onChange={setLossPct} format={(v) => `-${v.toFixed(2)}%`} />
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Horizon (days)</Label>
            <Input type="number" min={30} max={1000} value={horizon} onChange={(e) => setHorizon(+e.target.value)} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Pill label="Ideal time to target" value={`${daysIdeal} days`} />
            <Pill label="Realistic time to target" value={daysRealistic > 0 ? `${daysRealistic} days` : "Not in horizon"} />
            <Pill label="End balance (realistic)" value={fmtMoney(data[data.length - 1].realistic)} />
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="i" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={70}
                  tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
                <Area type="monotone" dataKey="ideal" name="Ideal compounding" stroke="var(--color-chart-1)" fill="url(#i)" strokeWidth={2} />
                <Area type="monotone" dataKey="realistic" name="Realistic scenario" stroke="var(--color-chart-2)" fill="url(#r)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span className="text-sm font-semibold tabular-nums">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Pill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
