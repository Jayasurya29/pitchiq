import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X as XIcon,
  Send,
  Copy,
  Edit3,
  Mail,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Target,
  Building2,
  MapPin,
  Link2 as Linkedin,
} from "lucide-react";
import type { OutreachRecord } from "@/api/outreach";
import {
  approveOutreach,
  rejectOutreach,
  markSent,
  revertToPending,
  updateOutreach,
} from "@/api/outreach";

interface Props {
  record: OutreachRecord;
  onClose?: () => void;
}

/**
 * Strip the AI-generated signature from the email body so the user's
 * own mail-client signature takes over. Walks lines from the bottom
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

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Review" },
    approved: { bg: "bg-blue-100", text: "text-blue-800", label: "Approved" },
    sent: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Sent" },
    rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

/**
 * Surface how trustworthy the brief is at a glance.
 * Pure heuristic from server data — no separate field needed.
 */
function deriveResearchConfidence(record: OutreachRecord): "high" | "medium" | "low" {
  const painCount = (record.pain_points || []).length;
  const valueCount = (record.value_props || []).length;
  const hasAngle = !!record.outreach_angle;
  const hasHook = !!record.personalization_hook;
  const hasContactSummary = !!record.contact_summary;
  const score =
    painCount + valueCount +
    (hasAngle ? 2 : 0) +
    (hasHook ? 2 : 0) +
    (hasContactSummary ? 1 : 0);
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const config = {
    high:   { bg: "bg-emerald-100", text: "text-emerald-800", icon: "✓", label: "Strong research" },
    medium: { bg: "bg-amber-100",   text: "text-amber-800",   icon: "~", label: "Moderate research" },
    low:    { bg: "bg-rose-100",    text: "text-rose-800",    icon: "⚠", label: "Thin research — verify" },
  } as const;
  const c = config[confidence];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}
      title={
        confidence === "low"
          ? "Research came back sparse — fact-check this brief before sending."
          : confidence === "medium"
          ? "Research had some gaps — quick scan recommended."
          : "Research returned strong, varied data."
      }
    >
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
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
      className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-purple-600 transition"
    >
      {children}
    </button>
  );
}

export default function OutreachDetail({ record, onClose }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<"subject" | "body" | "linkedin" | null>(null);
  const [activeTab, setActiveTab] = useState<"brief" | "sources">("brief");
  const [draft, setDraft] = useState({
    email_subject: record.email_subject || "",
    email_body: record.email_body || "",
    linkedin_message: record.linkedin_message || "",
  });
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showConfirmSent, setShowConfirmSent] = useState(false);

  // Re-sync when a different record is loaded
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
    setActiveTab("brief");
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
    const tryLegacy = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopyMsg(label);
          setTimeout(() => setCopyMsg(null), 1800);
        })
        .catch(() => {
          if (tryLegacy()) {
            setCopyMsg(label);
            setTimeout(() => setCopyMsg(null), 1800);
          }
        });
    } else if (tryLegacy()) {
      setCopyMsg(label);
      setTimeout(() => setCopyMsg(null), 1800);
    }
  }

  const fitScore = record.fit_score ?? 0;
  const fitColor =
    fitScore >= 80 ? "bg-emerald-500 text-white"
      : fitScore >= 60 ? "bg-amber-500 text-white"
      : fitScore >= 40 ? "bg-stone-500 text-white"
      : "bg-red-400 text-white";

  const initials = (record.contact_name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarBg =
    fitScore >= 80 ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
      : fitScore >= 60 ? "bg-gradient-to-br from-amber-500 to-amber-600"
      : fitScore >= 40 ? "bg-gradient-to-br from-stone-500 to-stone-600"
      : "bg-gradient-to-br from-red-400 to-red-500";

  const firstName = (record.contact_name || "").split(" ")[0] || "";
  const confidence = deriveResearchConfidence(record);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ── Header — avatar + name + contact info chips ─────── */}
      <div className="px-6 pt-6 pb-5 border-b border-stone-100 bg-gradient-to-br from-stone-50/50 to-white flex-shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm ${avatarBg}`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-stone-900 truncate">
                  {record.contact_name}
                </h2>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${fitColor}`}>
                  FIT {fitScore}
                </div>
              </div>
              {record.contact_title && (
                <p className="text-sm font-medium text-stone-700 mb-2">
                  {record.contact_title}
                </p>
              )}
              {/* Hotel + location chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-md text-xs font-semibold">
                  <Building2 className="w-3 h-3" />
                  {record.hotel_name}
                </span>
                {record.hotel_location && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md text-xs">
                    <MapPin className="w-3 h-3" />
                    {record.hotel_location}
                  </span>
                )}
              </div>
              {/* Email + LinkedIn */}
              {(record.email || record.linkedin_url) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {record.email && (
                    <a
                      href={`mailto:${record.email}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 hover:border-purple-300 hover:bg-purple-50 text-stone-700 hover:text-purple-700 rounded-md text-xs transition group"
                      title="Click to compose in default mail client"
                    >
                      <Mail className="w-3 h-3 text-stone-400 group-hover:text-purple-600" />
                      <span className="truncate max-w-[200px]">{record.email}</span>
                    </a>
                  )}
                  {record.linkedin_url && (
                    <a
                      href={record.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 hover:border-blue-300 hover:bg-blue-50 text-stone-700 hover:text-blue-700 rounded-md text-xs transition group"
                      title="Open LinkedIn profile in new tab"
                    >
                      <Linkedin className="w-3 h-3 text-stone-400 group-hover:text-blue-600" />
                      LinkedIn
                      <ExternalLink className="w-2.5 h-2.5 text-stone-300 group-hover:text-blue-500" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition flex-shrink-0"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Status pill row */}
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-stone-100">
          <StatusPill status={record.approval_status} />
          <ConfidenceBadge confidence={confidence} />
          {record.send_time && (
            <span className="text-stone-400">· Suggested send: {record.send_time}</span>
          )}
        </div>
      </div>

      {/* ── Sub-tab strip ── */}
      <div className="flex items-center gap-1 px-5 pt-3 bg-white border-b border-stone-100 flex-shrink-0">
        <button
          onClick={() => setActiveTab("brief")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-md transition border-b-2 -mb-px ${
            activeTab === "brief"
              ? "text-purple-700 border-purple-600 bg-purple-50/40"
              : "text-stone-500 border-transparent hover:text-stone-700 hover:bg-stone-50"
          }`}
        >
          Brief &amp; Email
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-md transition border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === "sources"
              ? "text-stone-800 border-stone-600 bg-stone-50/60"
              : "text-stone-500 border-transparent hover:text-stone-700 hover:bg-stone-50"
          }`}
        >
          <ExternalLink className="w-3 h-3" />
          Signals
          {(record.signals?.length ?? 0) > 0 && (
            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
              activeTab === "sources" ? "bg-stone-200 text-stone-700" : "bg-stone-100 text-stone-500"
            }`}>
              {record.signals.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Body (scrollable) — content swaps by activeTab ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ════════════════ SIGNALS TAB ════════════════ */}
        {activeTab === "sources" && (
          <>
            {(!record.signals || record.signals.length === 0) ? (
              <div className="text-center py-16">
                <ExternalLink className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No buying signals captured</p>
                <p className="text-xs text-stone-400 mt-1">
                  This may be a thin research record — try regenerating.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-900 font-semibold mb-0.5">
                    Buying signals identified during research
                  </p>
                  <p className="text-xs text-blue-700">
                    These are the signals the Researcher and Analyst agents found that informed the brief.
                  </p>
                </div>
                <ul className="space-y-2">
                  {record.signals.map((s, i) => (
                    <li key={i} className="flex gap-3 p-3.5 bg-white border border-stone-200 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-stone-800 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
                {record.hiring_signals && record.hiring_signals.length > 0 && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mt-4">
                      Hiring signals
                    </h4>
                    <ul className="space-y-2">
                      {record.hiring_signals.map((s, i) => (
                        <li key={`h-${i}`} className="flex gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-lg">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-stone-800 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {record.awards && record.awards.length > 0 && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mt-4">
                      Awards / recognition
                    </h4>
                    <ul className="space-y-2">
                      {record.awards.map((s, i) => (
                        <li key={`a-${i}`} className="flex gap-3 p-3.5 bg-yellow-50/60 border border-yellow-200/60 rounded-lg">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-stone-800 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════ BRIEF & EMAIL TAB ════════════════ */}
        {activeTab === "brief" && (
          <>
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
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-purple-800 bg-purple-100 rounded mb-1.5">
                        Angle
                      </span>
                      <p className="text-sm text-stone-900 leading-relaxed">{record.outreach_angle}</p>
                    </div>
                  )}
                  {record.personalization_hook && (
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-indigo-800 bg-indigo-100 rounded mb-1.5">
                        Hook
                      </span>
                      <p className="text-sm text-stone-900 leading-relaxed italic">"{record.personalization_hook}"</p>
                    </div>
                  )}
                  {record.contact_summary && (
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-stone-700 bg-stone-100 rounded mb-1.5">
                        About {firstName || record.contact_name}
                      </span>
                      <p className="text-sm text-stone-700 leading-relaxed">{record.contact_summary}</p>
                    </div>
                  )}
                </div>
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
                        <li key={i} className="flex gap-2.5 text-sm text-stone-800 leading-relaxed">
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
                        <li key={i} className="flex gap-2.5 text-sm text-stone-800 leading-relaxed">
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

            {/* Signals hint — switches tab */}
            {record.signals && record.signals.length > 0 && (
              <button
                onClick={() => setActiveTab("sources")}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-stone-200 hover:border-stone-400 hover:bg-stone-50 rounded-lg transition group"
              >
                <span className="flex items-center gap-2 text-xs">
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
                  <span className="font-semibold text-stone-700">
                    {record.signals.length} buying signals identified
                  </span>
                  <span className="text-stone-400">— click to review</span>
                </span>
                <span className="text-xs font-semibold text-purple-600 group-hover:underline">
                  View signals →
                </span>
              </button>
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
                <span className="ml-auto text-[10px] text-sky-400 font-semibold">
                  Ready to send
                </span>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-sky-800 bg-sky-100 rounded">
                    Subject
                  </span>
                  <div className="flex gap-1">
                    <IconBtn onClick={() => copy(draft.email_subject, "subject")} title="Copy subject">
                      <Copy className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn onClick={() => setEditing(editing === "subject" ? null : "subject")} title="Edit">
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
                  <p className="text-base text-stone-900 font-semibold leading-relaxed">{draft.email_subject || "—"}</p>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-sky-800 bg-sky-100 rounded">
                    Body
                  </span>
                  <div className="flex gap-1">
                    <IconBtn onClick={() => copy(draft.email_body, "body")} title="Copy body">
                      <Copy className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn onClick={() => setEditing(editing === "body" ? null : "body")} title="Edit">
                      <Edit3 className="w-3 h-3" />
                    </IconBtn>
                    {record.email && (
                      <a
                        href={`mailto:${record.email}?subject=${encodeURIComponent(draft.email_subject || "")}&body=${encodeURIComponent(stripAiSignature(draft.email_body || ""))}`}
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
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 font-mono"
                    rows={8}
                  />
                ) : (
                  <div className="bg-white/80 border border-sky-100 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed font-sans">{draft.email_body || "—"}</pre>
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
                    onClick={() => saveMut.mutate({
                      email_subject: draft.email_subject,
                      email_body: draft.email_body,
                    })}
                    disabled={saveMut.isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
                  >
                    {saveMut.isPending ? "Saving..." : "Save edits"}
                  </button>
                </div>
              )}
            </div>

            {/* LinkedIn Message */}
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
                    <IconBtn onClick={() => setEditing(editing === "linkedin" ? null : "linkedin")} title="Edit">
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
                    <p className="text-sm text-stone-800 leading-relaxed">{draft.linkedin_message || "—"}</p>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Sequence */}
            {record.follow_up_sequence && record.follow_up_sequence.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/70 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200/60">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Send className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-amber-900">
                    Follow-up Sequence
                  </h3>
                  <span className="ml-auto text-[10px] text-amber-400 font-semibold">
                    {record.follow_up_sequence.length} touches
                  </span>
                </div>
                <ul className="space-y-2">
                  {record.follow_up_sequence.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-stone-700 px-3 py-2 bg-white/70 border border-amber-100 rounded-md">
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 rounded">
                        {i + 1}
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {record.rejection_feedback && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                <span className="font-bold">Rejection notes:</span> {record.rejection_feedback}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer actions ────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-stone-100 bg-stone-50 flex-shrink-0 space-y-2">
        {copyMsg && (
          <p className="text-xs text-emerald-600 text-center">✓ Copied {copyMsg}</p>
        )}

        {showRejectInput ? (
          <div className="space-y-2">
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Why are you rejecting? (optional)"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:border-red-400"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectInput(false)}
                className="flex-1 px-3 py-2 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-md hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMut.mutate(rejectFeedback)}
                disabled={rejectMut.isPending}
                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        ) : showConfirmSent ? (
          <div className="space-y-2">
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900">
              <p className="font-semibold mb-0.5">Did you send the email?</p>
              <p className="text-blue-700 text-[11px]">
                Your default mail client should have opened with the draft. After you hit Send there, click below.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => sentMut.mutate()}
                disabled={sentMut.isPending}
                className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {sentMut.isPending ? "Marking..." : "Yes, mark as sent"}
              </button>
              <button
                onClick={() => setShowConfirmSent(false)}
                className="px-3 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-200 rounded-md hover:bg-stone-50"
              >
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {record.approval_status === "pending" && (
              <>
                <button
                  onClick={() => {
                    if (!record.email) {
                      alert("No email address on file for this contact. Add one first.");
                      return;
                    }
                    const subject = encodeURIComponent(draft.email_subject || "");
                    const body = encodeURIComponent(stripAiSignature(draft.email_body || ""));
                    window.location.href = `mailto:${record.email}?subject=${subject}&body=${body}`;
                    setTimeout(() => setShowConfirmSent(true), 400);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition"
                  title="Opens default mail client with the email pre-filled."
                >
                  <Mail className="w-4 h-4" />
                  Open in Outlook
                </button>
                <button
                  onClick={() => approveMut.mutate()}
                  disabled={approveMut.isPending}
                  className="px-3 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  title="Approve and save for later — no email sent now"
                >
                  <Check className="w-4 h-4" />
                  Save for later
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="px-3 py-2 text-sm font-semibold text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 flex items-center justify-center gap-1.5"
                >
                  <XIcon className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {record.approval_status === "approved" && (
              <>
                <button
                  onClick={() => {
                    if (!record.email) {
                      alert("No email address on file for this contact.");
                      return;
                    }
                    const subject = encodeURIComponent(draft.email_subject || "");
                    const body = encodeURIComponent(stripAiSignature(draft.email_body || ""));
                    window.location.href = `mailto:${record.email}?subject=${subject}&body=${body}`;
                    setTimeout(() => setShowConfirmSent(true), 400);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4" />
                  Open in Outlook
                </button>
                <button
                  onClick={() => sentMut.mutate()}
                  disabled={sentMut.isPending}
                  className="px-3 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-50"
                  title="Mark sent without opening (e.g. already sent manually)"
                >
                  Mark Sent
                </button>
              </>
            )}
            {record.approval_status === "sent" && (
              <>
                <div className="flex-1 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-md text-center">
                  ✓ Sent
                </div>
                <button
                  onClick={() => revertMut.mutate()}
                  disabled={revertMut.isPending}
                  className="px-3 py-2 text-[11px] font-semibold text-stone-600 bg-white border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-50 flex items-center gap-1"
                  title="Move this back to Pending Review"
                >
                  ↺ Revert
                </button>
              </>
            )}
            {record.approval_status === "rejected" && (
              <>
                <div className="flex-1 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-md text-center">
                  ✗ Rejected
                </div>
                <button
                  onClick={() => revertMut.mutate()}
                  disabled={revertMut.isPending}
                  className="px-3 py-2 text-[11px] font-semibold text-stone-600 bg-white border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-50 flex items-center gap-1"
                  title="Move this back to Pending Review"
                >
                  ↺ Revert
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}