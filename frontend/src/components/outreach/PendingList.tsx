import type { OutreachRecord } from "@/api/outreach";
import { cn } from "@/lib/utils";

interface Props {
  records: OutreachRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function scoreTileClass(score: number): string {
  if (score >= 80) return "bg-emerald-500 text-white";
  if (score >= 60) return "bg-amber-500 text-white";
  if (score >= 40) return "bg-stone-500 text-white";
  return "bg-red-400 text-white";
}

function statusPillClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "sent":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

function statusLabel(status: string): string {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "sent") return "Sent";
  return (status || "Pending").charAt(0).toUpperCase() + (status || "Pending").slice(1);
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
              {/* Squared score tile — matches SLH outreach left-list style */}
              <div
                className={cn(
                  "flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-md text-base font-bold tabular-nums shadow-sm",
                  scoreTileClass(r.fit_score)
                )}
              >
                {r.fit_score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-semibold text-stone-900 truncate">
                    {r.contact_name}
                  </h4>
                  <span
                    className={cn(
                      "ml-auto text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                      statusPillClass(r.approval_status)
                    )}
                  >
                    {statusLabel(r.approval_status)}
                  </span>
                </div>
                <p className="text-xs text-stone-500 truncate">
                  {r.contact_title}
                </p>
                <p className="text-xs text-stone-700 truncate mt-0.5 inline-flex items-center gap-1">
                  <span className="text-stone-400">🏨</span>
                  {r.hotel_name}
                </p>
                {angle && (
                  <p className="text-[11px] text-purple-700 italic mt-1.5 line-clamp-2 leading-snug">
                    <span className="font-semibold not-italic text-purple-900">Focus:</span> {angle}
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