import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Target, BookOpen, Calendar as CalendarIcon, LineChart, Sparkles, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/projections", label: "Projections", icon: LineChart },
  { to: "/goal", label: "Goal Setup", icon: Target },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 p-4 border-r border-border bg-sidebar/60 backdrop-blur-xl">
        <Brand />
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} />
          ))}
        </nav>
        <div className="mt-auto rounded-xl p-4 glass">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> Stay disciplined
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Compound consistency beats heroic days.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-xl">
        <Brand />
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </header>
      {open && (
        <nav className="md:hidden flex flex-col gap-1 p-3 border-b border-border bg-sidebar/80 backdrop-blur-xl">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} onClick={() => setOpen(false)} />
          ))}
        </nav>
      )}

      <main className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="size-9 rounded-lg grid place-items-center"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
        <LineChart className="size-5 text-primary-foreground" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight">Apex Edge</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Performance OS</span>
      </div>
    </Link>
  );
}

function NavItem({ to, label, icon: Icon, active, onClick }: {
  to: string; label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
