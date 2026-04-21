import { useState, useEffect } from "react";
import { Inbox, Loader2, Check, X, Mail, Link2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

interface PendingRecord {
  id: number;
  contact_name: string;
  contact_title: string;
  hotel_name: string;
  hotel_location: string;
  fit_score: number;
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  pain_points: string[];
  value_props: string[];
  send_time: string;
  approval_status: string;
  created_at: string;
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 px-3 py-2 -mb-px text-xs font-medium border-b-2 transition-colors " +
        (active
          ? "border-stone-900 text-stone-900"
          : "border-transparent text-stone-500 hover:text-stone-800")
      }
    >
      {children}
    </button>
  );
}

function ApprovalCard({
  record,
  onAction,
}: {
  record: PendingRecord;
  onAction: () => void;
}) {
  const [tab, setTab] = useState<"email" | "linkedin">("email");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  async function approve() {
    setLoading("approve");
    try {
      await api.post(`/approve/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to approve");
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    setLoading("reject");
    try {
      await api.post(`/reject/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to reject");
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold">{record.contact_name}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {record.contact_title} ·{" "}
              <span className="text-stone-700">{record.hotel_name}</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="muted">
              <span className={`font-semibold ${scoreColor(record.fit_score)}`}>
                {record.fit_score}
              </span>
              /100
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="flex gap-1 border-b border-stone-200">
          <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
            <Mail size={14} /> Email
          </TabBtn>
          <TabBtn active={tab === "linkedin"} onClick={() => setTab("linkedin")}>
            <Link2 size={14} /> LinkedIn
          </TabBtn>
        </div>

        {tab === "email" ? (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">
                Subject
              </div>
              <div className="text-sm font-medium">{record.email_subject}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">
                Body
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {record.email_body}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">
              Connection note
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {record.linkedin_message}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {tab === "email" ? (
            <>
              <Button onClick={approve} disabled={busy} size="sm">
                {loading === "approve" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Approve email & send
              </Button>
              <Button onClick={reject} disabled={busy} size="sm" variant="secondary">
                <X size={14} />
                Reject email
              </Button>
            </>
          ) : (
            <>
              <Button disabled={busy} size="sm" variant="secondary">
                <Check size={14} />
                Approve LinkedIn
              </Button>
              <Button onClick={reject} disabled={busy} size="sm" variant="secondary">
                <X size={14} />
                Reject LinkedIn
              </Button>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function Pending() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchPending() {
    try {
      const { data } = await api.get("/pending");
      setRecords(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPending(); }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pending approval</h1>
        <p className="mt-1 text-sm text-stone-500">
          Messages waiting for human review before they get sent.
        </p>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't load pending items. Is the FastAPI backend running on port 8000?
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 py-16 text-center">
          <Inbox size={28} className="mx-auto text-stone-400" />
          <p className="mt-3 text-sm font-medium text-stone-700">Nothing pending</p>
          <p className="mt-1 text-xs text-stone-500">
            Drafts will appear here after research completes.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {records.map((r) => (
          <ApprovalCard key={r.id} record={r} onAction={fetchPending} />
        ))}
      </div>
    </div>
  );
}