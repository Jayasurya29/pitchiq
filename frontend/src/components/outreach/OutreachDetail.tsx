import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X as XIcon,
  Send,
  Copy,
  Edit3,
  Loader2,
  Mail,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Target,
  Building2,
  MapPin,
  Link2 as Linkedin,
  Calendar,
  RotateCcw,
} from "lucide-react";
import type { OutreachRecord } from "@/api/outreach";
import {
  approveOutreach,
  rejectOutreach,
  markSent,
  revertToPending,
  updateOutreach,
} from "@/api/outreach";
import { cn } from "@/lib/utils";

interface Props {
  record: OutreachRecord;
  onClose?: () => void;
}

/**
 * Strip the AI-generated signature from the email body so the user's
 * own mail client signature takes over. Walks lines from the bottom
 * looking for a known closing word ("Best,", "Regards," etc.) and cuts
 * everything from that line on.
 */
function stripAiSignature(body: string): string {
  if (!body) return "";
  const closings = [
    "best,", "best regards,", "regards,", "cheers,",
    "thanks,", "thank you,", "sincerely,",
  ];
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim().toLowerCase();
    if (closings.some((c) => trimmed === c || trimmed === c.replace(",", ""))) {
      return lines.slice(0, i).join("\n").replace(/\s+$/, "");
    }
  }
  return body;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-sky-600";
  return "text-stone-500";
}

function scoreBgRing(score: number): string {
  if (score >= 80) return "bg-emerald-50 ring-emerald-200";
  if (score >= 60) return "bg-amber-50 ring-amber-200";
  if (score >= 40) return "bg-sky-50 ring-sky-200";
  return "bg-stone-100 ring-stone-200";
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition"
    >
      {children}
    </button>
  );
}

export default function OutreachDetail({ record, onClose }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<"subject" | "body" | "linkedin" | null>(null);
  const [draft, setDraft] = useState({
    email_subject: record.email_subject || "",
    email_body: record.email_body || "",
    linkedin_message: record.linkedin_message || "",
  });
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showConfirmSent, setShowConfirmSent] = useState(false);

  // Re-sync draft when a different record is loaded
  useEffect(() => {
    setDraft({
      email_subject: record.email_subject || "",
      email_body: record.email_body || "",
      linkedin_message: record.linkedin_message || "",
    });
    setEditing(null);
    setShowRejectInput(false);
    setRejectFeedback("");
    setShowConfirmSent(false);
  }, [record.id]);

  const saveMut = useMutation({
    mutationFn: (patch: { email_subject?: string; email_body?: string; linkedin_message?: string }) =>
      updateOutreach(record.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      setEditing(null);
    },
  });

  const approveMut = useMutation({
    mutationFn: () => approveOutreach(record.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (feedback: string) => rejectOutreach(record.id, feedback),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      setShowRejectInput(false);
      setRejectFeedback("");
    },
  });

  const sentMut = useMutation({
    mutationFn: () => markSent(record.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      setShowConfirmSent(false);
    },
  });

  const revertMut = useMutation({
    mutationFn: () => revertToPending(record.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });

  function copy(text: string, label: string) {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setCopyMsg(label);
    setTimeout(() => setCopyMsg(null), 1500);
  }

  const firstName = record.contact_name.split(" ")[0] || record.contact_name;
  const isPending = record.approval_status === "pending";
  const isApproved = record.approval_status === "approved";
  const isSent = record.approval_status === "sent";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top header — identity + score */}
      <div className="flex items-start gap-4 p-5 border-b border-stone-200">
        <div
          className={cn(
            "flex-shrink-0 inline-flex flex-col items-center justify-center w-16 h-16 rounded-xl ring-1 ring-inset tabular-nums",
            scoreBgRing(record.fit_score)
          )}
        >
          <span className={cn("text-2xl font-bold leading-none", scoreColor(record.fit_score))}>
            {record.fit_score}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-500 mt-1">
            Fit Score
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-stone-900 leading-tight">
            {record.contact_name}
          </h2>
          <p className="text-sm text-stone-600 mt-0.5">{record.contact_title}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              {record.hotel_name}
            </span>
            {record.hotel_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {record.hotel_location}
              </span>
            )}
            {record.opening_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Opens: {record.opening_date}
              </span>
            )}
            {record.linkedin_url && (
              <a
                href={record.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Linkedin className="w-3.5 h-3.5" />
                LinkedIn
              </a>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
            title="Close detail"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-stone-50/60 border-b border-stone-200 text-xs">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded ring-1 ring-inset",
            isPending && "bg-amber-100 text-amber-800 ring-amber-200",
            isApproved && "bg-emerald-100 text-emerald-800 ring-emerald-200",
            record.approval_status === "rejected" && "bg-rose-100 text-rose-800 ring-rose-200",
            isSent && "bg-sky-100 text-sky-800 ring-sky-200"
          )}
        >
          {record.approval_status}
        </span>
        {record.quality_approved && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Check className="w-3 h-3" />
            Quality passed
          </span>
        )}
        {record.send_time && (
          <span className="ml-auto text-stone-500">
            Suggested send: <span className="text-stone-800 font-medium">{record.send_time}</span>
          </span>
        )}
      </div>

      {/* Body (scrollable) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Personalization Brief */}
        {(record.outreach_angle || record.personalization_hook || record.contact_summary) && (
          <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-200/70 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-purple-200/60">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-purple-900">
                Personalization Brief
              </h3>
            </div>
            <div className="space-y-4">
              {record.outreach_angle && (
                <div>
                  <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-purple-800 bg-purple-100 rounded mb-1.5">
                    Angle
                  </span>
                  <p className="text-sm text-stone-900 leading-relaxed">{record.outreach_angle}</p>
                </div>
              )}
              {record.personalization_hook && (
                <div>
                  <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-indigo-800 bg-indigo-100 rounded mb-1.5">
                    Hook
                  </span>
                  <p className="text-sm text-stone-900 leading-relaxed italic">
                    "{record.personalization_hook}"
                  </p>
                </div>
              )}
              {record.contact_summary && (
                <div>
                  <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-stone-700 bg-stone-100 rounded mb-1.5">
                    About {firstName}
                  </span>
                  <p className="text-sm text-stone-700 leading-relaxed">{record.contact_summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fit breakdown */}
        {record.fit_breakdown?.rationale && (
          <div className="bg-white border border-stone-200 rounded-xl p-4 text-xs text-stone-600">
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-stone-700 uppercase tracking-wider">
              Score breakdown
            </div>
            <p className="leading-relaxed">
              Base{" "}
              <span className="font-semibold text-stone-900">
                {record.fit_breakdown.base_account_score ?? 0}/100
              </span>
              {typeof record.fit_breakdown.research_adjustment === "number" &&
                record.fit_breakdown.research_adjustment !== 0 && (
                  <>
                    {" "}
                    <span
                      className={
                        record.fit_breakdown.research_adjustment > 0
                          ? "text-emerald-600 font-semibold"
                          : "text-rose-600 font-semibold"
                      }
                    >
                      {record.fit_breakdown.research_adjustment > 0 ? "+" : ""}
                      {record.fit_breakdown.research_adjustment}
                    </span>{" "}
                    from research
                  </>
                )}
              . {record.fit_breakdown.rationale}
            </p>
          </div>
        )}

        {/* Pain points + value props */}
        {(record.pain_points.length > 0 || record.value_props.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {record.pain_points.length > 0 && (
              <div className="bg-gradient-to-br from-rose-50/70 to-orange-50/40 border border-rose-200/70 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-rose-200/60">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-rose-600" />
                  </div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-rose-900">
                    Pain Points
                  </h3>
                  <span className="ml-auto text-[10px] font-bold text-rose-400">
                    {record.pain_points.length}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {record.pain_points.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-sm text-stone-800 leading-relaxed"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {record.value_props.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/70 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-200/60">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-emerald-900">
                    Value Props
                  </h3>
                  <span className="ml-auto text-[10px] font-bold text-emerald-400">
                    {record.value_props.length}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {record.value_props.map((v, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-sm text-stone-800 leading-relaxed"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Email Draft */}
        <div className="bg-gradient-to-br from-sky-50/70 to-blue-50/40 border border-sky-200/70 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-sky-200/60">
            <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-sky-600" />
            </div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-sky-900">
              Email Draft
            </h3>
            <span className="ml-auto text-[10px] text-sky-500 font-semibold uppercase tracking-wider">
              {isPending ? "Ready to review" : isApproved ? "Approved" : isSent ? "Sent" : "Drafted"}
            </span>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-sky-800 bg-sky-100 rounded">
                Subject
              </span>
              <div className="flex gap-1">
                <IconBtn onClick={() => copy(draft.email_subject, "subject")} title="Copy subject">
                  <Copy className="w-3 h-3" />
                </IconBtn>
                <IconBtn
                  onClick={() => setEditing(editing === "subject" ? null : "subject")}
                  title="Edit"
                >
                  <Edit3 className="w-3 h-3" />
                </IconBtn>
              </div>
            </div>
            {editing === "subject" ? (
              <textarea
                value={draft.email_subject}
                onChange={(e) => setDraft({ ...draft, email_subject: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                rows={1}
              />
            ) : (
              <p className="text-base text-stone-900 font-semibold leading-relaxed">
                {draft.email_subject || "—"}
              </p>
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-sky-800 bg-sky-100 rounded">
                Body
              </span>
              <div className="flex gap-1">
                <IconBtn onClick={() => copy(draft.email_body, "body")} title="Copy body">
                  <Copy className="w-3 h-3" />
                </IconBtn>
                <IconBtn
                  onClick={() => setEditing(editing === "body" ? null : "body")}
                  title="Edit"
                >
                  <Edit3 className="w-3 h-3" />
                </IconBtn>
                {record.email && (
                  <a
                    href={`mailto:${record.email}?subject=${encodeURIComponent(
                      draft.email_subject || ""
                    )}&body=${encodeURIComponent(stripAiSignature(draft.email_body || ""))}`}
                    title="Open in default mail client"
                    className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-sky-600 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            {editing === "body" ? (
              <textarea
                value={draft.email_body}
                onChange={(e) => setDraft({ ...draft, email_body: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                rows={8}
              />
            ) : (
              <div className="bg-white/80 border border-sky-100 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed font-sans">
                  {draft.email_body || "—"}
                </pre>
              </div>
            )}
          </div>

          {(editing === "subject" || editing === "body") && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDraft({
                    email_subject: record.email_subject || "",
                    email_body: record.email_body || "",
                    linkedin_message: record.linkedin_message || "",
                  });
                  setEditing(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  saveMut.mutate({
                    email_subject: draft.email_subject,
                    email_body: draft.email_body,
                  })
                }
                disabled={saveMut.isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
              >
                {saveMut.isPending ? "Saving..." : "Save edits"}
              </button>
            </div>
          )}
        </div>

        {/* LinkedIn message */}
        {(record.linkedin_message || draft.linkedin_message) && (
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/70 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200/60">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-blue-900">
                LinkedIn Message
              </h3>
              <span className="ml-auto text-[10px] text-blue-400 font-semibold">
                {(draft.linkedin_message || "").length}/280
              </span>
              <div className="flex gap-1 ml-1">
                <IconBtn onClick={() => copy(draft.linkedin_message, "linkedin")} title="Copy">
                  <Copy className="w-3 h-3" />
                </IconBtn>
                <IconBtn
                  onClick={() => setEditing(editing === "linkedin" ? null : "linkedin")}
                  title="Edit"
                >
                  <Edit3 className="w-3 h-3" />
                </IconBtn>
              </div>
            </div>
            {editing === "linkedin" ? (
              <>
                <textarea
                  value={draft.linkedin_message}
                  onChange={(e) => setDraft({ ...draft, linkedin_message: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  rows={3}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setDraft({ ...draft, linkedin_message: record.linkedin_message || "" });
                      setEditing(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveMut.mutate({ linkedin_message: draft.linkedin_message })}
                    disabled={saveMut.isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveMut.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white/80 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-stone-800 leading-relaxed">
                  {draft.linkedin_message || "—"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Follow-up sequence */}
        {record.follow_up_sequence && record.follow_up_sequence.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200">
              <Calendar className="w-4 h-4 text-stone-500" />
              <h3 className="text-xs uppercase tracking-wider font-bold text-stone-700">
                Follow-up sequence
              </h3>
            </div>
            <ul className="space-y-1.5">
              {record.follow_up_sequence.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="w-1 h-1 rounded-full bg-stone-300 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex-shrink-0 border-t border-stone-200 px-5 py-3 bg-white">
        {showRejectInput ? (
          <div className="space-y-2">
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Why are you rejecting this? (optional, helps the agents learn)"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectFeedback("");
                }}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMut.mutate(rejectFeedback)}
                disabled={rejectMut.isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMut.isPending ? "Rejecting..." : "Confirm reject"}
              </button>
            </div>
          </div>
        ) : showConfirmSent ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-stone-700">
              Did you actually send the email?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmSent(false)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200"
              >
                Not yet
              </button>
              <button
                onClick={() => sentMut.mutate()}
                disabled={sentMut.isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
              >
                {sentMut.isPending ? "Marking..." : "Yes, mark sent"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => approveMut.mutate()}
                  disabled={approveMut.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve
                </button>
                {record.email && (
                  <a
                    href={`mailto:${record.email}?subject=${encodeURIComponent(
                      draft.email_subject || ""
                    )}&body=${encodeURIComponent(stripAiSignature(draft.email_body || ""))}`}
                    onClick={() => setShowConfirmSent(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700"
                  >
                    <Send className="w-4 h-4" />
                    Open in Mail
                  </a>
                )}
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 rounded-md hover:bg-rose-100 border border-rose-200"
                >
                  <XIcon className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {!isPending && (
              <button
                onClick={() => revertMut.mutate()}
                disabled={revertMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-stone-700 bg-stone-100 rounded-md hover:bg-stone-200 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {revertMut.isPending ? "Reverting..." : "Move back to pending"}
              </button>
            )}
            {copyMsg && (
              <span className="ml-auto text-xs text-emerald-700 font-semibold">
                Copied {copyMsg}!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}