import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPct, toDateKey, type Market } from "@/lib/trading";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/journal")({
  head: () => ({ meta: [{ title: "Journal — Apex Edge" }] }),
  component: JournalPage,
});

const markets: Market[] = ["Forex", "Crypto", "Stocks", "Indices", "Commodities", "Other"];

function JournalPage() {
  const { goal, trades, timeline, addTrade, deleteTrade } = useStore();
  const [date, setDate] = useState(toDateKey(new Date()));
  const [numTrades, setNumTrades] = useState(1);
  const [pnlPct, setPnlPct] = useState<string>("");
  const [pnlAmount, setPnlAmount] = useState<string>("");
  const [winRate, setWinRate] = useState<string>("");
  const [market, setMarket] = useState<Market>("Forex");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = pnlPct !== "" ? +pnlPct : null;
    const amt = pnlAmount !== "" ? +pnlAmount : null;
    if (pct === null && amt === null) return toast.error("Enter P&L % or amount");
    // determine balance before
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    let bal = goal.startingBalance;
    for (const t of sorted) if (t.date < date) bal = bal + (t.pnlAmount ?? bal * (t.pnlPct / 100));
    const finalPct = pct !== null ? pct : ((amt ?? 0) / bal) * 100;
    const finalAmt = amt !== null ? amt : bal * (finalPct / 100);
    addTrade({
      date,
      trades: numTrades,
      pnlPct: finalPct,
      pnlAmount: finalAmt,
      winRate: winRate ? +winRate : undefined,
      market,
      notes: notes || undefined,
      imageUrl: imageUrl || undefined,
    });
    toast.success("Trade logged");
    setPnlPct(""); setPnlAmount(""); setNotes(""); setImageUrl("");
  };

  const reversed = [...timeline].reverse();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Discipline</p>
        <h1 className="text-3xl font-semibold tracking-tight">Trading Journal</h1>
      </header>

      <form onSubmit={submit} className="glass rounded-2xl p-5 md:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground"># Trades</Label>
          <Input type="number" min={0} value={numTrades} onChange={(e) => setNumTrades(+e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Market</Label>
          <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">P&L %</Label>
          <Input type="number" step="0.01" placeholder="e.g. 1.5 or -0.8" value={pnlPct} onChange={(e) => setPnlPct(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">P&L $ (optional)</Label>
          <Input type="number" step="0.01" placeholder="auto from %" value={pnlAmount} onChange={(e) => setPnlAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Win rate %</Label>
          <Input type="number" min={0} max={100} value={winRate} onChange={(e) => setWinRate(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Setup, emotions, mistakes, lessons..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshot URL</Label>
          <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
          <Button type="submit">Save entry</Button>
        </div>
      </form>

      <div className="glass rounded-2xl p-2 md:p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Market</th>
              <th className="text-right p-3">Trades</th>
              <th className="text-right p-3">P&L %</th>
              <th className="text-right p-3">P&L $</th>
              <th className="text-right p-3">Balance</th>
              <th className="text-center p-3">vs Target</th>
              <th className="text-left p-3">Notes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {reversed.map((d) => {
              const win = d.pnlAmount > 0;
              const hitTarget = d.pnlPct >= goal.dailyTargetPct;
              return (
                <tr key={d.trade.id} className="border-t border-border hover:bg-accent/30">
                  <td className="p-3 tabular-nums">{d.date}</td>
                  <td className="p-3">{d.trade.market ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{d.trade.trades}</td>
                  <td className={`p-3 text-right tabular-nums ${win ? "text-[color:var(--color-success)]" : d.pnlAmount < 0 ? "text-[color:var(--color-destructive)]" : ""}`}>
                    {fmtPct(d.pnlPct)}
                  </td>
                  <td className={`p-3 text-right tabular-nums ${win ? "text-[color:var(--color-success)]" : d.pnlAmount < 0 ? "text-[color:var(--color-destructive)]" : ""}`}>
                    {fmtMoney(d.pnlAmount)}
                  </td>
                  <td className="p-3 text-right tabular-nums">{fmtMoney(d.balanceAfter)}</td>
                  <td className="p-3 text-center">
                    {hitTarget ? <Badge className="bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]">Hit</Badge>
                      : win ? <Badge variant="secondary">Below</Badge>
                      : d.pnlAmount === 0 ? <Badge variant="outline">BE</Badge>
                      : <Badge variant="destructive">Loss</Badge>}
                  </td>
                  <td className="p-3 max-w-xs truncate text-muted-foreground">{d.trade.notes ?? "—"}</td>
                  <td className="p-3">
                    <Button size="icon" variant="ghost" onClick={() => deleteTrade(d.trade.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              );
            })}
            {reversed.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No trades logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
