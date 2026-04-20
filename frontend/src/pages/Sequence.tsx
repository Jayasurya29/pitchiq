import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

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
        const res = await axios.get(`${API_URL}/history`)
        setRecords(res.data)
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
      const res = await axios.post(`${API_URL}/sequence/${id}`)
      setTouches(res.data.touches)
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

  const touchColor = (type: string) => {
    if (type === 'Intro') return { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' }
    if (type === 'Value Hook') return { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' }
    return { bg: '#fff7ed', color: '#f97316', border: '#fed7aa' }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{color: '#111827'}}>Sequence Builder</h1>
        <p className="text-sm" style={{color: '#6b7280'}}>
          Generate a 3-touch follow-up campaign for any researched contact.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Contact list */}
        <div className="col-span-1">
          <p className="text-xs font-medium mb-3" style={{color: '#374151'}}>Select a contact</p>
          {fetching ? (
            <div className="flex items-center gap-2 text-sm" style={{color: '#9ca3af'}}>
              <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{borderColor: '#e5e7eb', borderTopColor: '#6366f1'}} />
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(record => (
                <button
                  key={record.id}
                  onClick={() => generateSequence(record.id)}
                  className="w-full text-left rounded-xl p-4 transition-all"
                  style={{
                    background: selectedId === record.id ? '#eef2ff' : '#ffffff',
                    border: `1px solid ${selectedId === record.id ? '#6366f1' : '#e5e7eb'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{background: selectedId === record.id ? '#6366f1' : '#f3f4f6', color: selectedId === record.id ? '#ffffff' : '#6b7280'}}>
                        {record.contact_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{color: '#111827'}}>{record.contact_name}</p>
                        <p className="text-xs mt-0.5" style={{color: '#9ca3af'}}>{record.hotel_name}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold" style={{color: record.fit_score >= 80 ? '#10b981' : '#f59e0b'}}>
                      {record.fit_score}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sequence */}
        <div className="col-span-2">
          {!selectedId && !loading && (
            <div className="rounded-xl p-16 text-center" style={{background: '#ffffff', border: '1px dashed #e5e7eb'}}>
              <p className="text-sm" style={{color: '#9ca3af'}}>Select a contact to generate their sequence</p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl p-16 text-center" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{borderColor: '#e5e7eb', borderTopColor: '#6366f1'}} />
                <p className="text-sm" style={{color: '#6b7280'}}>Generating 3-touch sequence...</p>
                <p className="text-xs" style={{color: '#9ca3af'}}>Takes about 10 seconds</p>
              </div>
            </div>
          )}

          {touches.length > 0 && (
            <div className="space-y-4">

              {/* Timeline */}
              <div className="flex items-center gap-2 mb-2">
                {touches.map((touch, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{background: touchColor(touch.type).bg, color: touchColor(touch.type).color, border: `1px solid ${touchColor(touch.type).border}`}}>
                      Day {touch.day} · {touch.type}
                    </div>
                    {i < touches.length - 1 && (
                      <div className="w-8 h-px" style={{background: '#e5e7eb'}} />
                    )}
                  </div>
                ))}
              </div>

              {/* Touch cards */}
              {touches.map((touch, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3" style={{background: touchColor(touch.type).bg, borderBottom: `1px solid ${touchColor(touch.type).border}`}}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{background: touchColor(touch.type).color, color: '#ffffff'}}>
                        Day {touch.day}
                      </span>
                      <span className="text-sm font-medium" style={{color: touchColor(touch.type).color}}>
                        {touch.type}
                      </span>
                    </div>
                    <button
                      onClick={() => copy(touch.body, `touch-${i}`)}
                      className="text-xs px-2 py-1 rounded-md transition-all"
                      style={{
                        background: copied === `touch-${i}` ? '#ecfdf5' : '#ffffff',
                        color: copied === `touch-${i}` ? '#10b981' : '#6b7280',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      {copied === `touch-${i}` ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium mb-3 pb-3" style={{color: '#374151', borderBottom: '1px solid #f3f4f6'}}>
                      {touch.subject}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{color: '#4b5563'}}>
                      {touch.body}
                    </p>
                  </div>

                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}