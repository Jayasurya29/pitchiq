import { useState, useEffect } from "react";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

interface HistoryRecord {
  id: number;
  contact_name: string;
  contact_title: string;
  hotel_name: string;
  hotel_location: string;
  fit_score: number;
  email_subject: string;
  quality_approved: boolean;
  approval_status: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge variant="success">sent</Badge>;
  if (status === "rejected") return <Badge variant="muted">rejected</Badge>;
  return <Badge variant="default">pending</Badge>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-4 py-2">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get("/history");
        setRecords(data);
      } catch {
        console.error("Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const approved = records.filter(r => r.approval_status === "approved").length;
  const avgScore = records.length
    ? Math.round(records.reduce((a, r) => a + r.fit_score, 0) / records.length)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-stone-500">
          Outreach that's already been sent or rejected.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total researches", value: records.length },
          { label: "Approved", value: approved },
          { label: "Avg fit score", value: avgScore },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs text-stone-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold tabular-nums text-stone-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 py-16 text-center">
          <HistoryIcon size={28} className="mx-auto text-stone-400" />
          <p className="mt-3 text-sm font-medium text-stone-700">No sent messages yet</p>
        </div>
      )}

      {records.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <Th>Contact</Th>
                <Th>Hotel</Th>
                <Th>Subject</Th>
                <Th>Score</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-stone-100 hover:bg-stone-50/50"
                >
                  <Td>
                    <div className="font-medium text-stone-900">{r.contact_name}</div>
                    <div className="text-xs text-stone-500">{r.contact_title}</div>
                  </Td>
                  <Td>
                    <div>{r.hotel_name}</div>
                  </Td>
                  <Td>
                    <div className="text-xs text-stone-500 max-w-xs truncate">{r.email_subject}</div>
                  </Td>
                  <Td className="text-stone-700 font-medium">{r.fit_score}</Td>
                  <Td>
                    <StatusBadge status={r.approval_status} />
                  </Td>
                  <Td className="text-stone-500 text-xs">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}