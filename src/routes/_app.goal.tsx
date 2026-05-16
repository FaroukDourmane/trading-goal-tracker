import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { daysToReachTarget, fmtMoney } from "@/lib/trading";

export const Route = createFileRoute("/_app/goal")({
  head: () => ({ meta: [{ title: "Goal Setup — Apex Edge" }] }),
  component: GoalPage,
});

function GoalPage() {
  const { goal, setGoal, resetAll } = useStore();
  const nav = useNavigate();
  const [g, setG] = useState(goal);

  const update = <K extends keyof typeof g>(k: K, v: (typeof g)[K]) => setG((x) => ({ ...x, [k]: v }));

  const days = daysToReachTarget(g.startingBalance, g.targetBalance, g.dailyTargetPct);
  const calendarDays = Math.ceil(days * (7 / Math.max(1, g.tradingDaysPerWeek)));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Configuration</p>
        <h1 className="text-3xl font-semibold tracking-tight">Goal Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Define your account growth mission.</p>
      </header>

      <form
        className="glass rounded-2xl p-5 md:p-6 grid sm:grid-cols-2 gap-4"
        onSubmit={(e) => { e.preventDefault(); setGoal(g); toast.success("Goal saved"); nav({ to: "/" }); }}
      >
        <Field label="Starting balance ($)">
          <Input type="number" min={1} step="0.01" value={g.startingBalance}
            onChange={(e) => update("startingBalance", +e.target.value)} required />
        </Field>
        <Field label="Target balance ($)">
          <Input type="number" min={1} step="0.01" value={g.targetBalance}
            onChange={(e) => update("targetBalance", +e.target.value)} required />
        </Field>
        <Field label="Daily target profit (%)">
          <Input type="number" min={0} step="0.01" value={g.dailyTargetPct}
            onChange={(e) => update("dailyTargetPct", +e.target.value)} required />
        </Field>
        <Field label="Risk per trade (%)">
          <Input type="number" min={0} step="0.01" value={g.riskPerTradePct}
            onChange={(e) => update("riskPerTradePct", +e.target.value)} required />
        </Field>
        <Field label="Leverage (optional)">
          <Input type="number" min={0} value={g.leverage ?? ""}
            onChange={(e) => update("leverage", e.target.value ? +e.target.value : undefined)} />
        </Field>
        <Field label="Trading days / week">
          <Input type="number" min={1} max={7} value={g.tradingDaysPerWeek}
            onChange={(e) => update("tradingDaysPerWeek", +e.target.value)} />
        </Field>
        <Field label="Start date">
          <Input type="date" value={g.startDate} onChange={(e) => update("startDate", e.target.value)} />
        </Field>
        <Field label="Deadline (optional)">
          <Input type="date" value={g.deadline ?? ""} onChange={(e) => update("deadline", e.target.value || undefined)} />
        </Field>

        <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 mt-2">
          <Pill label="Trading days needed" value={days || "—"} />
          <Pill label="Approx. calendar days" value={calendarDays || "—"} />
          <Pill label="Growth multiple" value={`${(g.targetBalance / g.startingBalance).toFixed(2)}×`} />
        </div>

        <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
          <Button type="submit">Save goal</Button>
          <Button type="button" variant="outline" onClick={() => setG(goal)}>Reset changes</Button>
          <Button type="button" variant="ghost" className="ml-auto text-destructive"
            onClick={() => { if (confirm("Wipe goal + all trades?")) { resetAll(); toast.success("All data cleared"); } }}>
            Reset everything
          </Button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        Target: {fmtMoney(g.targetBalance)} from {fmtMoney(g.startingBalance)} compounding at {g.dailyTargetPct}%/day.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
