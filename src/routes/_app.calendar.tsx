import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmtMoney, fmtPct, toDateKey } from "@/lib/trading";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Apex Edge" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { timeline } = useStore();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "win-target" | "win" | "loss" | "be" | "none">("all");

  const map = useMemo(() => Object.fromEntries(timeline.map((d) => [d.date, d])), [timeline]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7) cells.push(null);

  const monthlyStats = useMemo(() => {
    const days = timeline.filter((d) => d.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
    const pnl = days.reduce((s, d) => s + d.pnlAmount, 0);
    const wins = days.filter((d) => d.pnlAmount > 0).length;
    return { count: days.length, pnl, wins, losses: days.filter((d) => d.pnlAmount < 0).length };
  }, [timeline, year, month]);

  const sel = selected ? map[selected] : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Trading Calendar</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {cursor.toLocaleString("en", { month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="grid sm:grid-cols-4 gap-3">
        <StatPill label="Days traded" value={monthlyStats.count} />
        <StatPill label="Wins / Losses" value={`${monthlyStats.wins} / ${monthlyStats.losses}`} />
        <StatPill label="Month P&L" value={fmtMoney(monthlyStats.pnl)} tone={monthlyStats.pnl >= 0 ? "success" : "danger"} />
        <StatPill label="Win rate" value={`${monthlyStats.count ? Math.round((monthlyStats.wins / monthlyStats.count) * 100) : 0}%`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "win-target", "win", "loss", "be", "none"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "win-target" ? "Hit target" : f === "win" ? "Profit (below target)" : f === "loss" ? "Losses" : f === "be" ? "Break-even" : "No activity"}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <LegendDot color="var(--color-success)" /> Hit target
          <LegendDot color="var(--color-warning)" /> Profit
          <LegendDot color="var(--color-destructive)" /> Loss
          <LegendDot color="var(--color-info)" /> Break-even
          <LegendDot color="var(--color-muted)" /> None
        </div>
      </div>

      <div className="glass rounded-2xl p-3 md:p-5">
        <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-widest text-muted-foreground mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <TooltipProvider delayDuration={120}>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const key = toDateKey(d);
              const day = map[key];
              const status = day?.status ?? "none";
              if (filter !== "all" && status !== filter) {
                return <DayCell key={i} d={d} status="none" muted />;
              }
              const cell = (
                <button onClick={() => day && setSelected(key)}
                  className="w-full text-left">
                  <DayCell d={d} status={status} pnl={day?.pnlPct} />
                </button>
              );
              return day ? (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>{cell}</TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-medium">{day.date}</div>
                      <div>P&L: {fmtPct(day.pnlPct)} · {fmtMoney(day.pnlAmount)}</div>
                      <div>Balance: {fmtMoney(day.balanceAfter)}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={i}>{cell}</div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{sel?.date}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="P&L %" value={fmtPct(sel.pnlPct)} tone={sel.pnlAmount >= 0 ? "success" : "danger"} />
                <Info label="P&L $" value={fmtMoney(sel.pnlAmount)} tone={sel.pnlAmount >= 0 ? "success" : "danger"} />
                <Info label="Balance" value={fmtMoney(sel.balanceAfter)} />
                <Info label="Trades" value={sel.trade.trades} />
                <Info label="Win rate" value={sel.trade.winRate != null ? `${sel.trade.winRate}%` : "—"} />
                <Info label="Market" value={sel.trade.market ?? "—"} />
              </div>
              {sel.trade.notes && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  <p className="text-sm leading-relaxed">{sel.trade.notes}</p>
                </div>
              )}
              {sel.trade.imageUrl && (
                <img src={sel.trade.imageUrl} alt="Trade screenshot" className="rounded-lg w-full" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayCell({ d, status, pnl, muted }: { d: Date; status: string; pnl?: number; muted?: boolean }) {
  const today = toDateKey(new Date()) === toDateKey(d);
  const color =
    status === "win-target" ? "bg-[color:var(--color-success)]/20 border-[color:var(--color-success)]/60 text-[color:var(--color-success)]"
      : status === "win" ? "bg-[color:var(--color-warning)]/15 border-[color:var(--color-warning)]/50 text-[color:var(--color-warning)]"
      : status === "loss" ? "bg-[color:var(--color-destructive)]/15 border-[color:var(--color-destructive)]/50 text-[color:var(--color-destructive)]"
      : status === "be" ? "bg-[color:var(--color-info)]/15 border-[color:var(--color-info)]/50 text-[color:var(--color-info)]"
      : "bg-muted/30 border-border text-muted-foreground";
  return (
    <div className={cn(
      "aspect-square rounded-lg border p-2 flex flex-col justify-between transition hover:scale-[1.03] hover:shadow-lg",
      color, muted && "opacity-30", today && "ring-2 ring-primary"
    )}>
      <span className="text-xs font-medium">{d.getDate()}</span>
      {pnl != null && <span className="text-[10px] md:text-xs tabular-nums font-semibold">{fmtPct(pnl, 1)}</span>}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" | "danger" }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums mt-1",
        tone === "success" && "text-[color:var(--color-success)]",
        tone === "danger" && "text-[color:var(--color-destructive)]")}>{value}</div>
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: color }} /></span>;
}

function Info({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums",
        tone === "success" && "text-[color:var(--color-success)]",
        tone === "danger" && "text-[color:var(--color-destructive)]")}>{value}</div>
    </div>
  );
}
