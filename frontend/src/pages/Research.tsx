import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface Contact {
  contact_name: string;
  contact_title: string;
  hotel_name: string;
  hotel_location: string;
  linkedin_url: string;
  email: string;
}

interface ResearchResult {
  contact_name: string;
  contact_title: string;
  hotel_name: string;
  fit_score: number;
  pain_points: string[];
  value_props: string[];
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  quality_approved: boolean;
  send_time: string;
  follow_up_sequence: string[];
}

const empty: Contact = {
  contact_name: "",
  contact_title: "",
  hotel_name: "",
  hotel_location: "",
  linkedin_url: "",
  email: "",
};

const inputCls =
  "h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function Research() {
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact>(empty);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const valid =
    contact.contact_name.trim() &&
    contact.hotel_name.trim() &&
    contact.hotel_location.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/research", contact);
      setResult(data);
    } catch {
      setError("Something went wrong. Check the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function field<K extends keyof Contact>(k: K) {
    return {
      value: contact[k] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setContact({ ...contact, [k]: e.target.value }),
    };
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Research a contact</h1>
        <p className="mt-1 text-sm text-stone-500">
          Paste a hotel decision-maker's details. The agents will research, score,
          and draft outreach. The draft lands in Pending for your approval.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-medium">Contact details</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              At minimum: name, hotel, and location.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact name" required>
                <input {...field("contact_name")} placeholder="e.g. Maya Rodriguez" className={inputCls} />
              </Field>
              <Field label="Title">
                <input {...field("contact_title")} placeholder="e.g. GM, Director of Operations" className={inputCls} />
              </Field>
              <Field label="Hotel name" required>
                <input {...field("hotel_name")} placeholder="e.g. The Langham Chicago" className={inputCls} />
              </Field>
              <Field label="Hotel location" required>
                <input {...field("hotel_location")} placeholder="e.g. Chicago, IL" className={inputCls} />
              </Field>
              <Field label="LinkedIn URL">
                <input {...field("linkedin_url")} placeholder="https://linkedin.com/in/..." className={inputCls} />
              </Field>
              <Field label="Email">
                <input {...field("email")} type="email" placeholder="contact@hotel.com" className={inputCls} />
              </Field>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!valid || loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Running agents…
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    Start research
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setContact(empty); setResult(null); setError(""); }}
              >
                Clear
              </Button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      {result && (
        <>
          {/* Score card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{result.contact_name}</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {result.contact_title} · <span className="text-stone-700">{result.hotel_name}</span>
                  </p>
                </div>
                <span className={`ml-auto text-2xl font-bold tabular-nums ${scoreColor(result.fit_score)}`}>
                  {result.fit_score}
                  <span className="text-sm font-normal text-stone-400">/100</span>
                </span>
              </div>
              <Button size="sm" onClick={() => navigate("/pending")}>
                Go to Pending
              </Button>
            </CardHeader>
          </Card>

          {/* Conversation hooks */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">Conversation hooks</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {result.pain_points.map((point, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-xs font-semibold mt-0.5 flex-shrink-0 text-blue-600">{i + 1}.</span>
                  <p className="text-xs leading-relaxed text-stone-600">{point}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">Draft email</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(result.email_body, "email")}
              >
                {copied === "email" ? "Copied!" : "Copy"}
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Subject</div>
                <div className="text-sm font-medium">{result.email_subject}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Body</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                  {result.email_body}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* LinkedIn */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">LinkedIn message</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(result.linkedin_message, "linkedin")}
              >
                {copied === "linkedin" ? "Copied!" : "Copy"}
              </Button>
            </CardHeader>
            <CardBody>
              <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Connection note</div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {result.linkedin_message}
              </div>
            </CardBody>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">Schedule</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-stone-700 mb-2">{result.send_time}</p>
              <div className="space-y-1.5">
                {result.follow_up_sequence.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-stone-300 flex-shrink-0" />
                    <p className="text-xs text-stone-500">{f}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}