import type { OutreachRecord } from "@/api/outreach";
import { cn } from "@/lib/utils";

interface Props {
  records: OutreachRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (score >= 60) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (score >= 40) return "bg-sky-100 text-sky-800 ring-sky-200";
  return "bg-stone-100 text-stone-700 ring-stone-200";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "approved":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "rejected":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    case "sent":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    default:
      return "bg-stone-50 text-stone-700 ring-stone-200";
  }
}

function statusLabel(status: string): string {
  return (status || "pending").charAt(0).toUpperCase() + (status || "pending").slice(1);
}

export default function PendingList({ records, selectedId, onSelect }: Props) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-stone-500">No outreach in this view</p>
        <p className="text-xs text-stone-400 mt-1">
          Run a Research from the sidebar to generate one.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-stone-100">
      {records.map((r) => {
        const selected = r.id === selectedId;
        const angle = r.outreach_angle || r.primary_angle || "";
        return (
          <li
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "p-4 cursor-pointer transition-colors border-l-4",
              selected
                ? "bg-purple-50/50 border-purple-500"
                : "border-transparent hover:bg-stone-50"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold ring-1 ring-inset tabular-nums",
                  scoreBadgeClass(r.fit_score)
                )}
              >
                {r.fit_score}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-semibold text-stone-900 truncate">
                    {r.contact_name}
                  </h4>
                  <span
                    className={cn(
                      "ml-auto text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ring-1 ring-inset",
                      statusBadgeClass(r.approval_status)
                    )}
                  >
                    {statusLabel(r.approval_status)}
                  </span>
                </div>
                <p className="text-xs text-stone-500 truncate">
                  {r.contact_title}
                </p>
                <p className="text-xs text-stone-700 truncate mt-0.5">
                  {r.hotel_name}
                </p>
                {angle && (
                  <p className="text-[11px] text-purple-700 italic mt-1.5 line-clamp-2 leading-snug">
                    Focus: {angle}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}