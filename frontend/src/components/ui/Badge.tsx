import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tier = "HOT" | "WARM" | "COLD";

const tierStyles: Record<Tier, string> = {
  HOT: "bg-red-100 text-red-700 ring-red-200",
  WARM: "bg-amber-100 text-amber-800 ring-amber-200",
  COLD: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        tierStyles[tier]
      )}
    >
      {tier}
    </span>
  );
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "muted" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles = {
    default: "bg-stone-100 text-stone-700 ring-stone-200",
    muted: "bg-transparent text-stone-500 ring-stone-200",
    success: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  }[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        styles,
        className
      )}
      {...props}
    />
  );
}