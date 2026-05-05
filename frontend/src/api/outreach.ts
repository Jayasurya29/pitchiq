import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the api/main.py _record_to_dict shape
// ─────────────────────────────────────────────────────────────────────────────

export interface FitBreakdown {
  base_account_score?: number;
  research_adjustment?: number;
  rationale?: string;
  components?: Record<string, { points: number; reason: string } | unknown>;
}

export interface QualityScores {
  addresses_by_first_name?: number;
  human_not_template?: number;
  specific_personalization?: number;
  right_length?: number;
  single_clear_cta?: number;
  no_buzzwords?: number;
}

export interface OutreachRecord {
  id: number;

  // Identity
  contact_name: string;
  contact_title: string;
  hotel_name: string;
  hotel_location: string;
  linkedin_url: string;
  email: string;
  opening_date: string;

  // Researcher
  company_summary: string;
  contact_summary: string;
  pain_points: string[];
  signals: string[];
  outreach_angle: string;
  personalization_hook: string;
  hotel_tier: string;
  hiring_signals: string[];
  awards: string[];

  // Analyst
  fit_score: number;
  fit_breakdown: FitBreakdown | null;
  primary_angle: string;
  value_props: string[];

  // Writer
  email_subject: string;
  email_body: string;
  linkedin_message: string;

  // Critic
  quality_approved: boolean;
  quality_scores: QualityScores | null;
  linkedin_quality: string;

  // Scheduler
  send_time: string;
  follow_up_sequence: string[];

  // Lifecycle
  approval_status: "pending" | "approved" | "rejected" | "sent" | string;
  rejection_feedback: string;
  created_at: string;
  updated_at: string;
}

export interface SequenceTouch {
  day: number;
  type: string;
  subject: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────────────────────

export async function getPending(): Promise<OutreachRecord[]> {
  const { data } = await api.get<OutreachRecord[]>("/pending");
  return data;
}

export async function getHistory(): Promise<OutreachRecord[]> {
  const { data } = await api.get<OutreachRecord[]>("/history");
  return data;
}

export async function getOne(id: number): Promise<OutreachRecord> {
  const { data } = await api.get<OutreachRecord>(`/research/${id}`);
  return data;
}

export async function approveOutreach(id: number) {
  const { data } = await api.post(`/approve/${id}`);
  return data;
}

export async function rejectOutreach(id: number, feedback = "") {
  const { data } = await api.post(`/reject/${id}`, null, {
    params: { feedback },
  });
  return data;
}

export async function markSent(id: number) {
  const { data } = await api.post(`/sent/${id}`);
  return data;
}

export async function revertToPending(id: number) {
  const { data } = await api.post(`/revert/${id}`);
  return data;
}

export async function updateOutreach(
  id: number,
  patch: { email_subject?: string; email_body?: string; linkedin_message?: string }
): Promise<OutreachRecord> {
  const { data } = await api.patch<OutreachRecord>(`/research/${id}`, patch);
  return data;
}

export async function generateSequence(id: number): Promise<{ touches: SequenceTouch[] }> {
  const { data } = await api.post<{ touches: SequenceTouch[] }>(`/sequence/${id}`);
  return data;
}