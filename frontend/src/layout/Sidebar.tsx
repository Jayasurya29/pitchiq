import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, Inbox, History, BarChart3, Settings, Sparkles, GitBranch } from "lucide-react";

const nav = [
  { to: "/research", label: "Research", icon: Search },
  { to: "/pending", label: "Pending", icon: Inbox },
  { to: "/history", label: "History", icon: History },
  { to: "/sequence", label: "Sequences", icon: GitBranch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings, disabled: true },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[color:var(--color-border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-primary)] text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">PitchIQ</div>
          <div className="text-[11px] text-[color:var(--color-text-muted)]">
            Outreach engine
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, disabled }) => (
          <NavLink
            key={to}
            to={to}
            onClick={(e) => disabled && e.preventDefault()}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                "transition-colors",
                disabled && "opacity-40 cursor-not-allowed",
                isActive && !disabled
                  ? "bg-stone-100 text-stone-900 font-medium"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{label}</span>
            {disabled && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-stone-400">
                soon
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[color:var(--color-border)] px-5 py-3 text-[11px] text-[color:var(--color-text-muted)]">
        v0.1 · PitchIQ
      </div>
    </aside>
  );
}