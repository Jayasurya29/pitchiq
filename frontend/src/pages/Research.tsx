import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

interface ResearchResult {
  contact_name: string
  contact_title: string
  hotel_name: string
  fit_score: number
  pain_points: string[]
  value_props: string[]
  email_subject: string
  email_body: string
  linkedin_message: string
  quality_approved: boolean
  send_time: string
  follow_up_sequence: string[]
}

const OUTREACH_GOALS = [
  { id: 'demo', label: 'Book a Demo', icon: '◈' },
  { id: 'intro', label: 'Intro Call', icon: '◎' },
  { id: 'followup', label: 'Follow-up', icon: '↻' },
  { id: 'partnership', label: 'Partnership', icon: '⟡' },
]

const PROGRESS_STEPS = [
  { label: 'Searching', sub: 'Scanning signals' },
  { label: 'Analyzing', sub: 'Scoring lead' },
  { label: 'Drafting', sub: 'Writing outreach' },
]

export default function Research() {
  const [form, setForm] = useState({
    contact_name: '',
    contact_title: '',
    hotel_name: '',
    hotel_location: '',
    linkedin_url: '',
    email: ''
  })
  const [goal, setGoal] = useState('intro')
  const [tone, setTone] = useState('friendly')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setProgressStep(0)

    const stepTimers = [
      setTimeout(() => setProgressStep(1), 8000),
      setTimeout(() => setProgressStep(2), 18000),
    ]

    try {
      const response = await axios.post(`${API_URL}/research`, form)
      setResult(response.data)
    } catch {
      setError('Pipeline failed. Make sure the API is running.')
    } finally {
      stepTimers.forEach(clearTimeout)
      setLoading(false)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const isActive = loading || result !== null

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{color: '#111827'}}>
          Research a contact
        </h1>
        <p className="text-sm" style={{color: '#6b7280'}}>
          Generate hyper-personalized outreach for any hotel decision-maker.
        </p>
      </div>

      <div className={`grid gap-6 transition-all duration-500 ${isActive ? 'grid-cols-2' : 'grid-cols-1 max-w-lg'}`}>

        {/* Form */}
        <div className="rounded-xl p-5 space-y-4 h-fit" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{color: '#374151'}}>Outreach goal</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTREACH_GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left"
                  style={{
                    background: goal === g.id ? '#eef2ff' : '#f9fafb',
                    border: `1px solid ${goal === g.id ? '#6366f1' : '#e5e7eb'}`,
                    color: goal === g.id ? '#6366f1' : '#6b7280'
                  }}
                >
                  <span className="text-xs">{g.icon}</span>
                  <span className="text-xs font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{color: '#374151'}}>Tone</label>
            <div className="flex gap-1 p-1 rounded-lg" style={{background: '#f3f4f6'}}>
              {['Formal', 'Friendly', 'Direct'].map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t.toLowerCase())}
                  className="flex-1 py-1.5 text-xs rounded-md font-medium transition-all"
                  style={{
                    background: tone === t.toLowerCase() ? '#ffffff' : 'transparent',
                    color: tone === t.toLowerCase() ? '#111827' : '#9ca3af',
                    boxShadow: tone === t.toLowerCase() ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>Name</label>
              <input
                type="text"
                placeholder="John Smith"
                value={form.contact_name}
                onChange={e => setForm({...form, contact_name: e.target.value})}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
                style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>Title</label>
              <input
                type="text"
                placeholder="GM"
                value={form.contact_title}
                onChange={e => setForm({...form, contact_title: e.target.value})}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
                style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>Hotel</label>
            <input
              type="text"
              placeholder="Marriott Biscayne Bay"
              value={form.hotel_name}
              onChange={e => setForm({...form, hotel_name: e.target.value})}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
              style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>Location</label>
              <input
                type="text"
                placeholder="Miami, FL"
                value={form.hotel_location}
                onChange={e => setForm({...form, hotel_location: e.target.value})}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
                style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>Email</label>
              <input
                type="email"
                placeholder="john@marriott.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
                style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>
              LinkedIn <span style={{color: '#9ca3af', fontWeight: 400}}>optional</span>
            </label>
            <input
              type="text"
              placeholder="linkedin.com/in/..."
              value={form.linkedin_url}
              onChange={e => setForm({...form, linkedin_url: e.target.value})}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
              style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color: '#374151'}}>
              Context notes <span style={{color: '#9ca3af', fontWeight: 400}}>optional</span>
            </label>
            <textarea
              placeholder="Any extra context for the AI..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all resize-none"
              style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827'}}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.contact_name || !form.hotel_name}
            className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{background: '#6366f1'}}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running pipeline...
              </span>
            ) : 'Run pipeline →'}
          </button>

          {error && (
            <p className="text-xs text-center" style={{color: '#ef4444'}}>{error}</p>
          )}
        </div>

        {/* Results */}
        {isActive && (
          <div className="space-y-3">

            {/* Progress */}
            {loading && (
              <div className="rounded-xl p-5" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                <p className="text-xs font-medium mb-4" style={{color: '#374151'}}>Pipeline running</p>
                <div className="space-y-4">
                  {PROGRESS_STEPS.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: i < progressStep ? '#10b981' : i === progressStep ? '#6366f1' : '#e5e7eb',
                          background: i < progressStep ? '#ecfdf5' : i === progressStep ? '#eef2ff' : '#f9fafb'
                        }}
                      >
                        {i < progressStep ? (
                          <span style={{color: '#10b981', fontSize: '11px'}}>✓</span>
                        ) : i === progressStep ? (
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{background: '#6366f1'}} />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{color: i <= progressStep ? '#111827' : '#d1d5db'}}>{step.label}</p>
                        <p className="text-xs" style={{color: i === progressStep ? '#6b7280' : '#d1d5db'}}>{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <>
                {/* Score */}
                <div className="rounded-xl p-4 flex items-center justify-between" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <div>
                    <p className="text-sm font-semibold" style={{color: '#111827'}}>
                      {result.contact_name}
                      <span style={{color: '#6b7280', fontWeight: 400}}> · {result.contact_title}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{color: '#9ca3af'}}>{result.hotel_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold tabular-nums" style={{color: scoreColor(result.fit_score)}}>
                      {result.fit_score}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest" style={{color: '#9ca3af'}}>fit score</p>
                  </div>
                </div>

                {/* Recommended angle */}
                <div className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <p className="text-xs font-medium mb-2" style={{color: '#374151'}}>Recommended angle</p>
                  <p className="text-sm leading-relaxed" style={{color: '#4b5563'}}>{result.value_props[0]}</p>
                </div>

                {/* Conversation hooks */}
                <div className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <p className="text-xs font-medium mb-3" style={{color: '#374151'}}>Conversation hooks</p>
                  <div className="space-y-2">
                    {result.pain_points.map((point, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="text-xs font-semibold mt-0.5 flex-shrink-0" style={{color: '#6366f1'}}>{i + 1}.</span>
                        <p className="text-xs leading-relaxed" style={{color: '#6b7280'}}>{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium" style={{color: '#374151'}}>Draft email</p>
                    <button
                      onClick={() => copy(result.email_body, 'email')}
                      className="text-xs px-2 py-1 rounded-md transition-all"
                      style={{
                        background: copied === 'email' ? '#ecfdf5' : '#f3f4f6',
                        color: copied === 'email' ? '#10b981' : '#6b7280',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      {copied === 'email' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs font-medium mb-3 pb-3" style={{color: '#374151', borderBottom: '1px solid #f3f4f6'}}>
                    {result.email_subject}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{color: '#4b5563'}}>
                    {result.email_body}
                  </p>
                </div>

                {/* LinkedIn */}
                <div className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium" style={{color: '#374151'}}>LinkedIn message</p>
                    <button
                      onClick={() => copy(result.linkedin_message, 'linkedin')}
                      className="text-xs px-2 py-1 rounded-md transition-all"
                      style={{
                        background: copied === 'linkedin' ? '#ecfdf5' : '#f3f4f6',
                        color: copied === 'linkedin' ? '#10b981' : '#6b7280',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      {copied === 'linkedin' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed" style={{color: '#4b5563'}}>{result.linkedin_message}</p>
                </div>

                {/* Schedule */}
                <div className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
                  <p className="text-xs font-medium mb-3" style={{color: '#374151'}}>Schedule</p>
                  <p className="text-xs mb-2" style={{color: '#6b7280'}}>{result.send_time}</p>
                  <div className="space-y-1.5">
                    {result.follow_up_sequence.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{background: '#d1d5db'}} />
                        <p className="text-xs" style={{color: '#9ca3af'}}>{f}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regenerate */}
                <button
                  onClick={handleSubmit}
                  className="w-full text-sm py-2.5 rounded-xl transition-all"
                  style={{background: '#ffffff', border: '1px solid #e5e7eb', color: '#6b7280'}}
                >
                  ↻ Regenerate
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}