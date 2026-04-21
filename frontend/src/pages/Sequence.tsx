import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

interface Touch {
  day: number
  type: string
  subject: string
  body: string
}

interface HistoryRecord {
  id: number
  contact_name: string
  contact_title: string
  hotel_name: string
  fit_score: number
  approval_status: string
}

export default function Sequence() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [touches, setTouches] = useState<Touch[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/history')
        setRecords(data)
      } catch {
        console.error('Failed to fetch history')
      } finally {
        setFetching(false)
      }
    }
    fetchHistory()
  }, [])

  const generateSequence = async (id: number) => {
    setSelectedId(id)
    setLoading(true)
    setTouches([])
    try {
      const { data } = await api.post(`/sequence/${id}`)
      setTouches(data.touches)
    } catch {
      console.error('Failed to generate sequence')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const touchColor = (type: string) => {
    if (type === 'Intro') return 'bg-blue-50 text-blue-700 ring-blue-200'
    if (type === 'Value Hook') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sequence Builder</h1>
        <p className="mt-1 text-sm text-stone-500">
          Generate a 3-touch follow-up campaign for any researched contact.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-6">

        {/* Contact list */}
        <div className="col-span-1 space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Select a contact</p>
          {fetching ? (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            records.map(record => (
              <button
                key={record.id}
                onClick={() => generateSequence(record.id)}
                className="w-full text-left rounded-lg border p-3 transition-all hover:bg-stone-50"
                style={{
                  background: selectedId === record.id ? '#eff6ff' : '#ffffff',
                  borderColor: selectedId === record.id ? '#2563eb' : '#e7e5e4',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{
                        background: selectedId === record.id ? '#2563eb' : '#f5f5f4',
                        color: selectedId === record.id ? '#ffffff' : '#78716c'
                      }}
                    >
                      {record.contact_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{record.contact_name}</p>
                      <p className="text-xs text-stone-500">{record.hotel_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${scoreColor(record.fit_score)}`}>
                    {record.fit_score}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sequence */}
        <div className="col-span-2 space-y-3">
          {!selectedId && !loading && (
            <div className="rounded-lg border border-dashed border-stone-300 py-16 text-center">
              <p className="text-sm font-medium text-stone-700">Select a contact</p>
              <p className="mt-1 text-xs text-stone-500">The 3-touch sequence will appear here.</p>
            </div>
          )}

          {loading && (
            <div className="rounded-lg border border-stone-200 bg-white py-16 text-center">
              <Loader2 size={20} className="mx-auto text-stone-400 animate-spin" />
              <p className="mt-3 text-sm text-stone-500">Generating 3-touch sequence…</p>
              <p className="mt-1 text-xs text-stone-400">Takes about 10 seconds</p>
            </div>
          )}

          {touches.length > 0 && (
            <>
              {/* Timeline */}
              <div className="flex items-center gap-2 mb-2">
                {touches.map((touch, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${touchColor(touch.type)}`}>
                      Day {touch.day} · {touch.type}
                    </span>
                    {i < touches.length - 1 && (
                      <div className="w-6 h-px bg-stone-200" />
                    )}
                  </div>
                ))}
              </div>

              {/* Touch cards */}
              {touches.map((touch, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${touchColor(touch.type)}`}>
                        Day {touch.day}
                      </span>
                      <span className="text-sm font-medium text-stone-700">{touch.type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copy(touch.body, `touch-${i}`)}
                    >
                      {copied === `touch-${i}` ? '✓ Copied' : 'Copy'}
                    </Button>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Subject</div>
                      <div className="text-sm font-medium text-stone-900">{touch.subject}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-1">Body</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{touch.body}</div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}