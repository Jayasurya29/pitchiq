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
  email_approval_status: string;
  linkedin_approval_status: string;
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

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
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
  const [loading, setLoading] = useState<string | null>(null);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  async function approveEmail() {
    setLoading("approve-email");
    try {
      await api.post(`/approve-email/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to approve email");
    } finally {
      setLoading(null);
    }
  }

  async function rejectEmail() {
    setLoading("reject-email");
    try {
      await api.post(`/reject-email/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to reject email");
    } finally {
      setLoading(null);
    }
  }

  async function approveLinkedIn() {
    setLoading("approve-linkedin");
    try {
      await api.post(`/approve-linkedin/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to approve LinkedIn");
    } finally {
      setLoading(null);
    }
  }

  async function rejectLinkedIn() {
    setLoading("reject-linkedin");
    try {
      await api.post(`/reject-linkedin/${record.id}`);
      onAction();
    } catch {
      console.error("Failed to reject LinkedIn");
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

        {/* Status indicators */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Mail size={11} /> Email:
            <StatusPill status={record.email_approval_status || "pending"} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Link2 size={11} /> LinkedIn:
            <StatusPill status={record.linkedin_approval_status || "pending"} />
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
            <div className="mt-2 text-[11px] text-stone-400">
              Approving will mark this as reviewed. LinkedIn sending coming soon.
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {tab === "email" ? (
            <>
              <Button
                onClick={approveEmail}
                disabled={busy || record.email_approval_status === "approved"}
                size="sm"
              >
                {loading === "approve-email" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {record.email_approval_status === "approved"
                  ? "Email approved"
                  : "Approve & send"}
              </Button>
              <Button
                onClick={rejectEmail}
                disabled={busy || record.email_approval_status === "rejected"}
                size="sm"
                variant="secondary"
              >
                <X size={14} />
                {record.email_approval_status === "rejected"
                  ? "Email rejected"
                  : "Reject email"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={approveLinkedIn}
                disabled={busy || record.linkedin_approval_status === "approved"}
                size="sm"
              >
                {loading === "approve-linkedin" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {record.linkedin_approval_status === "approved"
                  ? "LinkedIn approved"
                  : "Approve LinkedIn"}
              </Button>
              <Button
                onClick={rejectLinkedIn}
                disabled={busy || record.linkedin_approval_status === "rejected"}
                size="sm"
                variant="secondary"
              >
                <X size={14} />
                {record.linkedin_approval_status === "rejected"
                  ? "LinkedIn rejected"
                  : "Reject LinkedIn"}
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

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pending approval
        </h1>
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
          <p className="mt-3 text-sm font-medium text-stone-700">
            Nothing pending
          </p>
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